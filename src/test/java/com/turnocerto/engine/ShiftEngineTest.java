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
}
