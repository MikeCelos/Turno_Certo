package com.turnocerto.engine;

import com.turnocerto.dto.VmerConfigDto;
import com.turnocerto.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VmerShiftEngineTest {

    private final Profile defaultProfile = Profile.initialProfile();

    @Test
    @DisplayName("VMER Dia Útil 08:00-15:00 (7R * 29,91€ = 209,37€)")
    void testVmerDiaUtilManha() {
        // Segunda-feira 2026-08-03: 08:00 às 15:00
        Shift s = new Shift("2026-08-03T08:00+01:00", "2026-08-03T15:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(420, r.getTotalMinutes());
        assertEquals(20937L, r.getPayableCents(), "Deve ser exatamente 209,37 €");
    }

    @Test
    @DisplayName("VMER Dia Útil 15:00-22:00 (8R * 29,91€ = 239,28€)")
    void testVmerDiaUtilTarde() {
        // Segunda-feira 2026-08-03: 15:00 às 22:00
        Shift s = new Shift("2026-08-03T15:00+01:00", "2026-08-03T22:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(420, r.getTotalMinutes());
        assertEquals(23928L, r.getPayableCents(), "Deve ser exatamente 239,28 €");
    }

    @Test
    @DisplayName("VMER Dia Útil 22:00-08:00 (15R * 29,91€ = 448,65€)")
    void testVmerDiaUtilNoite() {
        // Segunda para Terça 2026-08-03 a 2026-08-04: 22:00 às 08:00
        Shift s = new Shift("2026-08-03T22:00+01:00", "2026-08-04T08:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(600, r.getTotalMinutes());
        assertEquals(44865L, r.getPayableCents(), "Deve ser exatamente 448,65 €");
    }

    @Test
    @DisplayName("VMER Véspera de Feriado 22:00-08:00 (19R * 29,91€ = 568,29€)")
    void testVmerVesperaFeriadoNoite() {
        // Terça 2026-06-09 para Quarta 2026-06-10 (Dia de Portugal - feriado)
        Profile p = Profile.initialProfile(List.of("2026-06-10"));
        Shift s = new Shift("2026-06-09T22:00+01:00", "2026-06-10T08:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, p, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(56829L, r.getPayableCents(), "Deve ser exatamente 568,29 €");
    }

    @Test
    @DisplayName("VMER Sábado 08:00-15:00 (8R * 29,91€ = 239,28€)")
    void testVmerSabadoManha() {
        // Sábado 2026-08-08: 08:00 às 15:00
        Shift s = new Shift("2026-08-08T08:00+01:00", "2026-08-08T15:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(23928L, r.getPayableCents(), "Deve ser exatamente 239,28 €");
    }

    @Test
    @DisplayName("VMER Sábado 15:00-22:00 (11,5R * 29,91€ = 343,97€)")
    void testVmerSabadoTarde() {
        // Sábado 2026-08-08: 15:00 às 22:00
        Shift s = new Shift("2026-08-08T15:00+01:00", "2026-08-08T22:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(34397L, r.getPayableCents(), "Deve ser exatamente 343,97 €");
    }

    @Test
    @DisplayName("VMER Sábado 22:00-08:00 (20R * 29,91€ = 598,20€)")
    void testVmerSabadoNoite() {
        // Sábado para Domingo 2026-08-08 a 2026-08-09: 22:00 às 08:00
        Shift s = new Shift("2026-08-08T22:00+01:00", "2026-08-09T08:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(59820L, r.getPayableCents(), "Deve ser exatamente 598,20 €");
    }

    @Test
    @DisplayName("VMER Domingo 08:00-15:00 (10,5R * 29,91€ = 314,06€)")
    void testVmerDomingoManha() {
        // Domingo 2026-08-09: 08:00 às 15:00
        Shift s = new Shift("2026-08-09T08:00+01:00", "2026-08-09T15:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(31406L, r.getPayableCents(), "Deve ser exatamente 314,06 €");
    }

    @Test
    @DisplayName("VMER Domingo 15:00-22:00 (11,5R * 29,91€ = 343,97€)")
    void testVmerDomingoTarde() {
        // Domingo 2026-08-09: 15:00 às 22:00
        Shift s = new Shift("2026-08-09T15:00+01:00", "2026-08-09T22:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(34397L, r.getPayableCents(), "Deve ser exatamente 343,97 €");
    }

    @Test
    @DisplayName("VMER Domingo 22:00-08:00 (16R * 29,91€ = 478,56€)")
    void testVmerDomingoNoite() {
        // Domingo para Segunda 2026-08-09 a 2026-08-10: 22:00 às 08:00
        Shift s = new Shift("2026-08-09T22:00+01:00", "2026-08-10T08:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(47856L, r.getPayableCents(), "Deve ser exatamente 478,56 €");
    }

    @Test
    @DisplayName("VMER Domingo Véspera de Feriado 22:00-08:00 (20R * 29,91€ = 598,20€)")
    void testVmerDomingoVesperaFeriadoNoite() {
        // Domingo 2026-10-04 para Segunda 2026-10-05 (Implantação da República)
        Profile p = Profile.initialProfile(List.of("2026-10-05"));
        Shift s = new Shift("2026-10-04T22:00+01:00", "2026-10-05T08:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, p, null);

        assertEquals(1, r.getSegments().size());
        assertEquals(59820L, r.getPayableCents(), "Deve ser exatamente 598,20 €");
    }

    @Test
    @DisplayName("VMER 24h Sábado (08:00-08:00: 8R + 11.5R + 20R = 39.5R * 29,91€ = 1181,45€)")
    void testVmer24hSabado() {
        // Sábado 08:00 até Domingo 08:00
        Shift s = new Shift("2026-08-08T08:00+01:00", "2026-08-09T08:00+01:00", "vmer", "VMER", 2991L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, null);

        assertEquals(3, r.getSegments().size());
        assertEquals(1440, r.getTotalMinutes());
        // 239,28 + 343,97 + 598,20 = 1181,45 €
        assertEquals(118145L, r.getPayableCents(), "Deve ser exatamente 1.181,45 €");
    }

    @Test
    @DisplayName("VMER modo linear simples por hora (12h a 30,00€/h = 360,00€)")
    void testVmerModoLinearSimples() {
        VmerConfigDto cfg = new VmerConfigDto("30,00", "hourly", null);
        Shift s = new Shift("2026-08-03T08:00+01:00", "2026-08-03T20:00+01:00", "vmer", "VMER", 3000L);
        ShiftCalculationResult r = VmerShiftEngine.calculateShift(s, defaultProfile, cfg);

        assertEquals(720, r.getTotalMinutes());
        assertEquals(36000L, r.getPayableCents(), "Deve ser exatamente 360,00 €");
    }
}
