package com.turnocerto.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ShiftCalculatorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Serve a página index.html na raiz e ficheiro estático")
    void testIndexPageServed() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("index.html"));

        mockMvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("Turno Certo")));
    }

    @Test
    @DisplayName("Calcula turno com sucesso via POST /api/calculate")
    void testCalculateShiftSuccess() throws Exception {
        String jsonPayload = """
                {
                    "workType": "Anestesia",
                    "regime": "extra",
                    "start": "2026-08-03T19:30",
                    "end": "2026-08-03T21:30",
                    "startOccurrence": "",
                    "endOccurrence": "",
                    "rate": "20,00",
                    "holidays": []
                }
                """;

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payableCents", is(7000)))
                .andExpect(jsonPath("$.regime", is("extra")))
                .andExpect(jsonPath("$.workType", is("Anestesia")))
                .andExpect(jsonPath("$.totalMinutes", is(120)))
                .andExpect(jsonPath("$.segments", hasSize(3)))
                .andExpect(jsonPath("$.segments[0].payableCents", is(1250)))
                .andExpect(jsonPath("$.segments[1].payableCents", is(1750)))
                .andExpect(jsonPath("$.segments[2].payableCents", is(4000)))
                .andExpect(jsonPath("$.payments[0].month", is("2026-10")))
                .andExpect(jsonPath("$.payments[0].payableCents", is(7000)));
    }

    @Test
    @DisplayName("Retorna 400 Bad Request com mensagem de erro quando input é inválido")
    void testCalculateShiftInvalidInput() throws Exception {
        String jsonPayload = """
                {
                    "workType": "Anestesia",
                    "regime": "extra",
                    "start": "2026-08-03T21:30",
                    "end": "2026-08-03T19:30",
                    "startOccurrence": "",
                    "endOccurrence": "",
                    "rate": "20,00",
                    "holidays": []
                }
                """;

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("A saída deve ser posterior à entrada.")));
    }

    @Test
    @DisplayName("Calcula turno misto 24h via POST /api/calculate")
    void testCalculateShiftMixedRegime() throws Exception {
        String jsonPayload = """
                {
                    "workType": "Urgência",
                    "regime": "misto",
                    "start": "2026-08-03T08:00",
                    "extraStart": "2026-08-03T20:00",
                    "end": "2026-08-04T08:00",
                    "startOccurrence": "",
                    "endOccurrence": "",
                    "extraStartOccurrence": "",
                    "rate": "20,00",
                    "holidays": []
                }
                """;

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payableCents", is(47500)))
                .andExpect(jsonPath("$.regime", is("misto")))
                .andExpect(jsonPath("$.totalMinutes", is(1440)))
                .andExpect(jsonPath("$.segments", hasSize(3)))
                .andExpect(jsonPath("$.segments[0].payableCents", is(0)))
                .andExpect(jsonPath("$.segments[1].payableCents", is(3500)))
                .andExpect(jsonPath("$.segments[2].payableCents", is(44000)));
    }

    @Test
    @DisplayName("Calcula folha mensal com múltiplos turnos via POST /api/calculate-roster")
    void testCalculateRosterEndpoint() throws Exception {
        String jsonPayload = """
                {
                    "shifts": [
                        {
                            "workType": "Anestesia",
                            "regime": "extra",
                            "start": "2026-08-03T20:00",
                            "end": "2026-08-04T08:00",
                            "rate": "20,00"
                        },
                        {
                            "workType": "Anestesia",
                            "regime": "extra",
                            "start": "2026-08-06T08:00",
                            "end": "2026-08-06T20:00",
                            "rate": "20,00"
                        }
                    ],
                    "holidays": []
                }
                """;

        mockMvc.perform(post("/api/calculate-roster")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalShifts", is(2)))
                .andExpect(jsonPath("$.totalMinutes", is(1440)))
                .andExpect(jsonPath("$.payableCents", greaterThan(0)))
                .andExpect(jsonPath("$.categorySummaries", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$.shifts", hasSize(2)));
    }

    @Test
    @DisplayName("Calcula turno com coeficientes/multiplicadores customizados")
    void testCalculateShiftWithCustomCoefficients() throws Exception {
        // Turno noturno das 20:00 às 08:00 (12h).
        // Padrão SNS extra: 1h a 1.75 e 11h a 2.00 -> 1*1.75*20 + 11*2.00*20 = 35 + 440 = 475 € (47500 cêntimos).
        // Com custom: firstExtra = 200 (2.00 R), nextExtra = 250 (2.50 R)
        // -> 1*2.00*20 + 11*2.50*20 = 40 + 550 = 590 € (59000 cêntimos).
        String jsonPayload = """
                {
                    "workType": "Anestesia",
                    "regime": "extra",
                    "start": "2026-08-03T20:00",
                    "end": "2026-08-04T08:00",
                    "rate": "20,00",
                    "holidays": [],
                    "customCoefficients": {
                        "util-noturno": {
                            "normal": 150,
                            "firstExtra": 200,
                            "nextExtra": 250
                        }
                    }
                }
                """;

        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payableCents", is(59000)))
                .andExpect(jsonPath("$.totalMinutes", is(720)));
    }

    @Test
    @DisplayName("Calcula turno misto com rate base (14,52) e extraRate (16,33)")
    void testCalculateShiftMistoComExtraRate() throws Exception {
        String jsonPayload = """
                {
                    "workType": "Medicina Interna",
                    "regime": "misto",
                    "start": "2026-08-03T08:00",
                    "end": "2026-08-04T08:00",
                    "extraStart": "2026-08-03T20:00",
                    "rate": "14,52",
                    "extraRate": "16,33",
                    "holidays": []
                }
                """;

        // Período normal: 08:00-20:00 (12h) -> 12 * 0 * 14.52 = 0
        // Período extra: 20:00-21:00 (1h) -> 1 * 1.75 * 16.33 = 28.5775 -> 28,58 € (2858 cêntimos)
        // Período extra: 21:00-08:00 (11h) -> 11 * 2.00 * 16.33 = 359.26 € (35926 cêntimos)
        // Total = 2858 + 35926 = 38784 cêntimos (387,84 €)
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payableCents", is(38784)))
                .andExpect(jsonPath("$.segments[0].rateCents", is(1452)))
                .andExpect(jsonPath("$.segments[1].rateCents", is(1633)))
                .andExpect(jsonPath("$.segments[2].rateCents", is(1633)));
    }

    @Test
    @DisplayName("Calcula turno VMER via POST /api/calculate")
    void testCalculateVmerShiftEndpoint() throws Exception {
        String jsonPayload = """
                {
                    "workType": "VMER",
                    "profileType": "vmer",
                    "regime": "vmer",
                    "start": "2026-08-08T22:00",
                    "end": "2026-08-09T08:00",
                    "rate": "29,91",
                    "holidays": []
                }
                """;

        // Sábado 22:00 às 08:00 -> 20 R * 29,91 € = 598,20 € (59820 cêntimos)
        mockMvc.perform(post("/api/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.payableCents", is(59820)))
                .andExpect(jsonPath("$.segments[0].payableCents", is(59820)))
                .andExpect(jsonPath("$.segments[0].category", is("vmer-noturno")));
    }

    @Test
    @DisplayName("Calcula folha mensal mista com turno SNS e turno VMER")
    void testCalculateRosterComTurnoSnsEVmer() throws Exception {
        String jsonPayload = """
                {
                    "shifts": [
                        {
                            "workType": "Anestesia",
                            "regime": "extra",
                            "start": "2026-08-03T20:00",
                            "end": "2026-08-04T08:00",
                            "rate": "20,00"
                        },
                        {
                            "workType": "VMER",
                            "profileType": "vmer",
                            "regime": "vmer",
                            "start": "2026-08-08T22:00",
                            "end": "2026-08-09T08:00",
                            "rate": "29,91"
                        }
                    ],
                    "holidays": []
                }
                """;

        // Anestesia: 475,00 € (47500 cêntimos)
        // VMER Sábado: 598,20 € (59820 cêntimos)
        // Total = 1073,20 € (107320 cêntimos)
        mockMvc.perform(post("/api/calculate-roster")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalShifts", is(2)))
                .andExpect(jsonPath("$.payableCents", is(107320)));
    }

    @Test
    @DisplayName("Calcula folha mensal com VMER e vmerConfig customizado")
    void testCalculateRosterComVmerCustomConfig() throws Exception {
        String jsonPayload = """
                {
                    "shifts": [
                        {
                            "workType": "VMER",
                            "profileType": "vmer",
                            "regime": "vmer",
                            "start": "2026-08-08T08:00",
                            "end": "2026-08-08T15:00",
                            "rate": "30,00"
                        }
                    ],
                    "holidays": [],
                    "vmerConfig": {
                        "baseRate": "30,00",
                        "mode": "hourly"
                    }
                }
                """;

        // Modo hourly: 7h * 30,00 € = 210,00 € (21000 cêntimos)
        mockMvc.perform(post("/api/calculate-roster")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalShifts", is(1)))
                .andExpect(jsonPath("$.payableCents", is(21000)));
    }
}
