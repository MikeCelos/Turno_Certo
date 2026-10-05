package com.turnocerto.engine;

import com.turnocerto.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ShiftEngineTest {

    private Shift baseShift() {
        return new Shift(
                "2026-08-03T19:30+01:00",
                "2026-08-03T21:30+01:00",
                "extra",
                "Anestesia",
                2000
        );
    }

    private ShiftCalculationResult calc(Shift s, List<String> holidays) {
        return ShiftEngine.calculateShift(s, Profile.initialProfile(holidays));
    }

    private ShiftCalculationResult calc(Shift s) {
        return calc(s, Collections.emptyList());
    }

    @Test
    @DisplayName("Primeira hora atravessa categoria sem reiniciar: exemplo de 70 euros")
    void testExemplo70EurosPrimeiraHoraAtravessaCategoriaSemReiniciar() {
        ShiftCalculationResult r = calc(baseShift());

        assertEquals(3, r.getSegments().size());

        Segment s0 = r.getSegments().get(0);
        assertEquals(30, s0.getMinutes());
        assertEquals(125, s0.getCoefficient());
        assertEquals(1250, s0.getPayableCents());

        Segment s1 = r.getSegments().get(1);
        assertEquals(30, s1.getMinutes());
        assertEquals(175, s1.getCoefficient());
        assertEquals(1750, s1.getPayableCents());

        Segment s2 = r.getSegments().get(2);
        assertEquals(60, s2.getMinutes());
        assertEquals(200, s2.getCoefficient());
        assertEquals(4000, s2.getPayableCents());

        assertEquals(7000, r.getPayableCents());
        assertEquals(1, r.getPayments().size());
        assertEquals("2026-10", r.getPayments().get(0).month());
        assertEquals(7000, r.getPayments().get(0).payableCents());
    }

    @Test
    @DisplayName("Normal paga apenas suplemento; normal diurno não paga extra")
    void testNormalPagaApenasSuplementoENormalDiurnoZero() {
        Shift s1 = baseShift();
        s1.setRegime("normal");
        assertEquals(1500, calc(s1).getPayableCents());

        Shift s2 = baseShift();
        s2.setRegime("normal");
        s2.setStart("2026-08-03T08:00+01:00");
        s2.setEnd("2026-08-03T20:00+01:00");
        assertEquals(0, calc(s2).getPayableCents());
    }

    @Test
    @DisplayName("Feriado tem precedência e a primeira hora não reinicia à meia-noite")
    void testFeriadoTemPrecedenciaEPrimeiraHoraNaoReiniciaMeiaNoite() {
        Shift s = baseShift();
        s.setStart("2026-08-04T23:30+01:00");
        s.setEnd("2026-08-05T01:30+01:00");

        ShiftCalculationResult r = calc(s, List.of("2026-08-05"));

        assertEquals(3, r.getSegments().size());

        Segment s0 = r.getSegments().get(0);
        assertEquals(30, s0.getMinutes());
        assertEquals("util-noturno", s0.getCategory());
        assertEquals(175, s0.getCoefficient());

        Segment s1 = r.getSegments().get(1);
        assertEquals(30, s1.getMinutes());
        assertEquals("especial-noturno", s1.getCategory());
        assertEquals(225, s1.getCoefficient());

        Segment s2 = r.getSegments().get(2);
        assertEquals(60, s2.getMinutes());
        assertEquals("especial-noturno", s2.getCategory());
        assertEquals(250, s2.getCoefficient());

        assertEquals(9000, r.getPayableCents());
    }

    @Test
    @DisplayName("Sábado muda às 13h e às 20h")
    void testSabadoMudaAs13hEAs20h() {
        Shift s = baseShift();
        s.setRegime("normal");
        s.setStart("2026-08-08T12:00+01:00");
        s.setEnd("2026-08-08T21:00+01:00");

        ShiftCalculationResult r = calc(s);

        assertEquals(3, r.getSegments().size());
        assertEquals(60, r.getSegments().get(0).getMinutes());
        assertEquals(0, r.getSegments().get(0).getPayableCoefficient());

        assertEquals(420, r.getSegments().get(1).getMinutes());
        assertEquals(50, r.getSegments().get(1).getPayableCoefficient());

        assertEquals(60, r.getSegments().get(2).getMinutes());
        assertEquals(100, r.getSegments().get(2).getPayableCoefficient());

        assertEquals(9000, r.getPayableCents());
    }

    @Test
    @DisplayName("Domingo e feriado usam categorias especiais")
    void testDomingoEFeriadoUsamCategoriasEspeciais() {
        for (String date : List.of("2026-08-09", "2026-08-10")) {
            Shift s = baseShift();
            s.setRegime("normal");
            s.setStart(date + "T07:00+01:00");
            s.setEnd(date + "T09:00+01:00");

            ShiftCalculationResult r = calc(s, List.of(date));
            assertEquals(2, r.getSegments().size());
            assertEquals("especial-noturno", r.getSegments().get(0).getCategory());
            assertEquals("especial-diurno", r.getSegments().get(1).getCategory());
            assertEquals(3000, r.getPayableCents());
        }
    }

    @Test
    @DisplayName("Fim exclusivo: às 20h exatas não inclui tempo noturno")
    void testFimExclusivoAs20hNaoIncluiNoturno() {
        Shift s = baseShift();
        s.setStart("2026-08-03T19:00+01:00");
        s.setEnd("2026-08-03T20:00+01:00");

        assertEquals(2500, calc(s).getPayableCents());
    }

    @Test
    @DisplayName("Fim de mês e de ano distribui pagamentos por data trabalhada (M+2)")
    void testFimDeMesEAnoDistribuiPagamentosPorDataTrabalhada() {
        Shift s = baseShift();
        s.setStart("2026-12-31T23:30+00:00");
        s.setEnd("2027-01-01T00:30+00:00");

        ShiftCalculationResult r = calc(s, List.of("2027-01-01"));

        assertEquals(2, r.getPayments().size());
        assertEquals("2027-02", r.getPayments().get(0).month());
        assertEquals(1750, r.getPayments().get(0).payableCents());
        assertEquals("2027-03", r.getPayments().get(1).month());
        assertEquals(2250, r.getPayments().get(1).payableCents());
    }

    @Test
    @DisplayName("R pertence ao turno/tipo de trabalho")
    void testRPertenceAoTurnoTipoDeTrabalho() {
        Shift s = baseShift();
        s.setRateCents(4000);
        s.setWorkType("Sala de Emergência");

        assertEquals(14000, calc(s).getPayableCents());
    }

    @Test
    @DisplayName("Perfil configurável sem categorias profissionais fixas")
    void testPerfilConfiguravelSemCategoriasProfissionaisFixas() {
        Profile p = Profile.initialProfile();
        p.setCoefficients(Collections.singletonMap("unica", new CategoryRates(100, 200, 300)));
        List<Window> singleWindow = List.of(new Window(0, "unica"));
        p.setHoliday(singleWindow);
        for (int i = 0; i < 7; i++) {
            p.getWeek().put(i, singleWindow);
        }

        ShiftCalculationResult r = ShiftEngine.calculateShift(baseShift(), p);
        assertEquals(10000, r.getPayableCents());
    }

    @Test
    @DisplayName("Arredondamento usa soma exata, não soma de parcelas arredondadas")
    void testArredondamentoUsaSomaExata() {
        Shift s = baseShift();
        s.setStart("2026-08-03T19:59+01:00");
        s.setEnd("2026-08-03T20:01+01:00");
        s.setRateCents(1001);

        assertEquals(50, calc(s).getPayableCents());
    }

    @Test
    @DisplayName("Mudança de hora usa minutos efetivamente decorridos")
    void testMudancaDeHoraMinutosDecorridos() {
        Shift s1 = baseShift();
        s1.setStart("2026-03-29T00:00+00:00");
        s1.setEnd("2026-03-29T04:00+01:00");
        assertEquals(180, calc(s1).getTotalMinutes());

        Shift s2 = baseShift();
        s2.setStart("2026-10-25T00:00+01:00");
        s2.setEnd("2026-10-25T04:00+00:00");
        assertEquals(300, calc(s2).getTotalMinutes());
    }

    @Test
    @DisplayName("Entradas inválidas são rejeitadas com exceção clara")
    void testEntradasInvalidasSaoRejeitadas() {
        Shift s = baseShift();

        // Saída igual à entrada
        s.setEnd(s.getStart());
        assertThrows(IllegalArgumentException.class, () -> calc(s));

        // R negativo
        Shift sRateNeg = baseShift();
        sRateNeg.setRateCents(-1);
        assertThrows(IllegalArgumentException.class, () -> calc(sRateNeg));

        // R zero
        Shift sRateZero = baseShift();
        sRateZero.setRateCents(0);
        assertThrows(IllegalArgumentException.class, () -> calc(sRateZero));

        // Data impossível: 30 de fevereiro
        Shift sFeb30 = baseShift();
        sFeb30.setStart("2026-02-30T19:30+00:00");
        assertThrows(IllegalArgumentException.class, () -> calc(sFeb30));

        // Sem offset
        Shift sNoOffset = baseShift();
        sNoOffset.setStart("2026-08-03T19:30");
        assertThrows(IllegalArgumentException.class, () -> calc(sNoOffset));

        // Offset incorreto para o mês de agosto (+00:00 em vez de +01:00)
        Shift sWrongOffset = baseShift();
        sWrongOffset.setStart("2026-08-03T19:30+00:00");
        assertThrows(IllegalArgumentException.class, () -> calc(sWrongOffset));

        // Tipo de trabalho vazio
        Shift sEmptyWork = baseShift();
        sEmptyWork.setWorkType("");
        assertThrows(IllegalArgumentException.class, () -> calc(sEmptyWork));

        // Hora inexistente na mudança de hora
        Shift sNonExistent = baseShift();
        sNonExistent.setStart("2026-03-29T01:30+00:00");
        assertThrows(IllegalArgumentException.class, () -> calc(sNonExistent));
    }

    @Test
    @DisplayName("Perfil inválido é rejeitado")
    void testPerfilInvalidoRejeitado() {
        Profile p = Profile.initialProfile();
        // Não começa às 00:00
        p.getWeek().get(1).set(0, new Window(1, "util-diurno"));
        assertThrows(IllegalArgumentException.class, () -> ShiftEngine.calculateShift(baseShift(), p));

        // Feriado com data inválida
        assertThrows(IllegalArgumentException.class, () -> calc(baseShift(), List.of("2026-02-30")));
    }

    @Test
    @DisplayName("Parcelas cobrem todo o turno sem lacunas ou sobreposições")
    void testParcelasCobremTodoOTurnoSemLacunas() {
        Shift s = baseShift();
        s.setStart("2026-08-08T07:17+01:00");
        s.setEnd("2026-08-10T09:13+01:00");

        ShiftCalculationResult r = calc(s);

        int sumMinutes = r.getSegments().stream().mapToInt(Segment::getMinutes).sum();
        assertEquals(r.getTotalMinutes(), sumMinutes);

        for (int i = 0; i < r.getSegments().size(); i++) {
            Segment seg = r.getSegments().get(i);
            long segDuration = (Instant.parse(seg.getEnd()).toEpochMilli() - Instant.parse(seg.getStart()).toEpochMilli()) / 60000;
            assertEquals(seg.getMinutes(), segDuration);

            if (i > 0) {
                assertEquals(r.getSegments().get(i - 1).getEnd(), seg.getStart());
            }
        }

        int firstExtraMinutes = r.getSegments().stream()
                .filter(Segment::isFirstExtra)
                .mapToInt(Segment::getMinutes)
                .sum();
        assertEquals(60, firstExtraMinutes);
    }

    @Test
    @DisplayName("Turno extra através da meia-noite junta parcelas contíguas com o mesmo regime e coeficiente")
    void testTurnoExtraAtravessaMeiaNoiteJuntaParcelasComMesmoRegimeECoeficiente() {
        // Exemplo: turno extra 20:30 segunda - 08:30 terça (2026-08-03T20:30 a 2026-08-04T08:30)
        Shift s = new Shift(
                "2026-08-03T20:30+01:00",
                "2026-08-04T08:30+01:00",
                "extra",
                "Urgência",
                2000
        );

        ShiftCalculationResult r = calc(s);

        // 12 horas = 720 minutos
        assertEquals(720, r.getTotalMinutes());

        // Deve ter exatamente 3 parcelas (e não 4 divididas à meia-noite):
        // 1) 20:30 - 21:30: 60m útil noturno (1,75 R - 1ª h extra)
        // 2) 21:30 - 08:00: 630m (10h30) útil noturno (2 R)
        // 3) 08:00 - 08:30: 30m útil diurno (1,5 R)
        assertEquals(3, r.getSegments().size());

        Segment s0 = r.getSegments().get(0);
        assertEquals(60, s0.getMinutes());
        assertEquals("util-noturno", s0.getCategory());
        assertTrue(s0.isFirstExtra());
        assertEquals(175, s0.getCoefficient());
        assertEquals(3500, s0.getPayableCents());

        Segment s1 = r.getSegments().get(1);
        assertEquals(630, s1.getMinutes());
        assertEquals("util-noturno", s1.getCategory());
        assertFalse(s1.isFirstExtra());
        assertEquals(200, s1.getCoefficient());
        assertEquals(42000, s1.getPayableCents());

        Segment s2 = r.getSegments().get(2);
        assertEquals(30, s2.getMinutes());
        assertEquals("util-diurno", s2.getCategory());
        assertFalse(s2.isFirstExtra());
        assertEquals(150, s2.getCoefficient());
        assertEquals(1500, s2.getPayableCents());

        assertEquals(47000, r.getPayableCents());
    }

    @Test
    @DisplayName("Turno 24h misto (12h normal + 12h extra em dia útil)")
    void testTurno24hMisto12hNormal12hExtraDiaUtil() {
        Shift s = new Shift(
                "2026-08-03T08:00+01:00",
                "2026-08-04T08:00+01:00",
                "misto",
                "Urgência Geral",
                2000,
                "2026-08-03T20:00+01:00",
                null
        );

        ShiftCalculationResult r = calc(s);

        // 24 horas = 1440 minutos
        assertEquals(1440, r.getTotalMinutes());
        assertEquals("misto", r.getRegime());

        // Segmentos esperados:
        // 0) 08:00 - 20:00 (12h) Normal diurno: 1R (incluído no vencimento base, suplemento = 0€)
        // 1) 20:00 - 21:00 (1h) Extraordinário noturno: 1.ª hora extra (1,75R = 35,00€)
        // 2) 21:00 - 08:00 (11h) Extraordinário noturno: seguintes (2,00R = 440,00€)
        assertEquals(3, r.getSegments().size());

        Segment s0 = r.getSegments().get(0);
        assertEquals(720, s0.getMinutes());
        assertEquals("util-diurno", s0.getCategory());
        assertEquals("normal", s0.getRegime());
        assertEquals(0, s0.getPayableCoefficient());
        assertEquals(0, s0.getPayableCents());

        Segment s1 = r.getSegments().get(1);
        assertEquals(60, s1.getMinutes());
        assertEquals("util-noturno", s1.getCategory());
        assertEquals("extra", s1.getRegime());
        assertTrue(s1.isFirstExtra());
        assertEquals(175, s1.getCoefficient());
        assertEquals(3500, s1.getPayableCents());

        Segment s2 = r.getSegments().get(2);
        assertEquals(660, s2.getMinutes());
        assertEquals("util-noturno", s2.getCategory());
        assertEquals("extra", s2.getRegime());
        assertFalse(s2.isFirstExtra());
        assertEquals(200, s2.getCoefficient());
        assertEquals(44000, s2.getPayableCents());

        // Total: 0 + 35 + 440 = 475,00 €
        assertEquals(47500, r.getPayableCents());
    }

    @Test
    @DisplayName("Turno misto com taxas R diferenciadas para normal e extra")
    void testTurnoMistoComTaxasRDistintas() {
        // Domingo: 08:00 às 20:00 normal (R=14,52€), 20:00 às 21:00 extra (R=20,00€)
        Shift s = new Shift(
                "2026-08-09T08:00+01:00",
                "2026-08-09T21:00+01:00",
                "misto",
                "Pediatria",
                2000,
                "2026-08-09T20:00+01:00",
                1452L
        );

        ShiftCalculationResult r = calc(s);

        assertEquals(2, r.getSegments().size());

        // Domingo diurno (especial-diurno, normal = 150, suplemento a pagar = 50 centésimos = 0,5R)
        // 720m * 1452 cêntimos * 50 / 6000 = 8712 cêntimos (87,12€)
        Segment s0 = r.getSegments().get(0);
        assertEquals(720, s0.getMinutes());
        assertEquals("normal", s0.getRegime());
        assertEquals(1452, s0.getRateCents());
        assertEquals(8712, s0.getPayableCents());

        // 20:00 às 21:00 extra (especial-noturno 1.ª hora extra = 225, R=20,00€)
        // 60m * 2000 cêntimos * 225 / 6000 = 4500 cêntimos (45,00€)
        Segment s1 = r.getSegments().get(1);
        assertEquals(60, s1.getMinutes());
        assertEquals("extra", s1.getRegime());
        assertEquals(2000, s1.getRateCents());
        assertEquals(4500, s1.getPayableCents());

        assertEquals(8712 + 4500, r.getPayableCents());
    }

    @Test
    @DisplayName("Validação do regime misto rejeita transição inválida ou ausente")
    void testValidacaoRegimeMisto() {
        // Sem hora de transição
        Shift s1 = new Shift("2026-08-03T08:00+01:00", "2026-08-04T08:00+01:00", "misto", "Urgência", 2000);
        assertThrows(IllegalArgumentException.class, () -> calc(s1));

        // Transição fora do intervalo (anterior à entrada)
        Shift s2 = new Shift("2026-08-03T08:00+01:00", "2026-08-04T08:00+01:00", "misto", "Urgência", 2000, "2026-08-03T07:00+01:00", null);
        assertThrows(IllegalArgumentException.class, () -> calc(s2));

        // Transição posterior à saída
        Shift s3 = new Shift("2026-08-03T08:00+01:00", "2026-08-04T08:00+01:00", "misto", "Urgência", 2000, "2026-08-04T09:00+01:00", null);
        assertThrows(IllegalArgumentException.class, () -> calc(s3));
    }

    @Test
    @DisplayName("Cálculo da Folha Mensal agrega corretamente múltiplos turnos em categorias de recibo")
    void testCalculoFolhaMensalComQuatroTurnos() {
        // Turno 1: Noite 12h extraordinário útil (segunda 20:00 - terça 08:00)
        Shift s1 = new Shift("2026-08-03T20:00+01:00", "2026-08-04T08:00+01:00", "extra", "Anestesia", 2000);
        // Turno 2: Dia 12h extraordinário útil (quinta 08:00 - quinta 20:00)
        Shift s2 = new Shift("2026-08-06T08:00+01:00", "2026-08-06T20:00+01:00", "extra", "Anestesia", 2000);
        // Turno 3: 24h Misto (sábado 08:00 - domingo 08:00, extraStart 20:00)
        Shift s3 = new Shift("2026-08-08T08:00+01:00", "2026-08-09T08:00+01:00", "misto", "Anestesia", 2000, "2026-08-08T20:00+01:00", 1452L);
        // Turno 4: Noite 12h extraordinário domingo (domingo 20:00 - segunda 08:00)
        Shift s4 = new Shift("2026-08-09T20:00+01:00", "2026-08-10T08:00+01:00", "extra", "Anestesia", 2000);

        List<Shift> shifts = List.of(s1, s2, s3, s4);
        Profile profile = Profile.initialProfile(Collections.emptyList());

        RosterCalculationResult roster = ShiftEngine.calculateRoster(shifts, profile);

        assertEquals(4, roster.getTotalShifts());
        assertEquals(720 + 720 + 1440 + 720, roster.getTotalMinutes()); // 3600 minutos = 60 horas
        assertEquals(4, roster.getShifts().size());

        long expectedTotal = ShiftEngine.calculateShift(s1, profile).getPayableCents()
                + ShiftEngine.calculateShift(s2, profile).getPayableCents()
                + ShiftEngine.calculateShift(s3, profile).getPayableCents()
                + ShiftEngine.calculateShift(s4, profile).getPayableCents();
        assertEquals(expectedTotal, roster.getPayableCents());

        assertFalse(roster.getCategorySummaries().isEmpty());
        long sumSummaries = roster.getCategorySummaries().stream().mapToLong(CategorySummary::getPayableCents).sum();
        assertTrue(Math.abs(sumSummaries - roster.getPayableCents()) <= 2);

        assertThrows(IllegalArgumentException.class, () -> ShiftEngine.calculateRoster(Collections.emptyList(), profile));
        assertThrows(IllegalArgumentException.class, () -> ShiftEngine.calculateRoster(null, profile));
    }
}


