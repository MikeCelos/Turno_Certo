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
}
