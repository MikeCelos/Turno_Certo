package com.turnocerto.engine;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LisbonTimeUtilsTest {

    @Test
    @DisplayName("Lisbon timestamp normal verão e inverno")
    void testLisbonTimestampNormal() {
        assertEquals("2026-08-03T19:30+01:00", LisbonTimeUtils.lisbonTimestamp("2026-08-03T19:30", ""));
        assertEquals("2026-12-15T10:00+00:00", LisbonTimeUtils.lisbonTimestamp("2026-12-15T10:00", ""));
    }

    @Test
    @DisplayName("Lisbon timestamp na mudança de hora - hora inexistente")
    void testLisbonTimestampInexistente() {
        // Na transição para horário de verão, 01:30 não existe
        assertThrows(IllegalArgumentException.class, () ->
                LisbonTimeUtils.lisbonTimestamp("2026-03-29T01:30", ""));
    }

    @Test
    @DisplayName("Lisbon timestamp na mudança de hora - hora repetida")
    void testLisbonTimestampRepetida() {
        // Na transição para horário de inverno, 01:30 ocorre duas vezes
        assertThrows(IllegalArgumentException.class, () ->
                LisbonTimeUtils.lisbonTimestamp("2026-10-25T01:30", ""));

        assertEquals("2026-10-25T01:30+01:00",
                LisbonTimeUtils.lisbonTimestamp("2026-10-25T01:30", "first"));
        assertEquals("2026-10-25T01:30+00:00",
                LisbonTimeUtils.lisbonTimestamp("2026-10-25T01:30", "second"));
    }

    @Test
    @DisplayName("Parse rate cents válido e inválido")
    void testParseRateCents() {
        assertEquals(2000, LisbonTimeUtils.parseRateCents("20,00"));
        assertEquals(2000, LisbonTimeUtils.parseRateCents("20.00"));
        assertEquals(2050, LisbonTimeUtils.parseRateCents("20,5"));
        assertEquals(2050, LisbonTimeUtils.parseRateCents("20.50"));
        assertEquals(2000, LisbonTimeUtils.parseRateCents("20"));
        assertEquals(1, LisbonTimeUtils.parseRateCents("0,01"));

        assertThrows(IllegalArgumentException.class, () -> LisbonTimeUtils.parseRateCents("0"));
        assertThrows(IllegalArgumentException.class, () -> LisbonTimeUtils.parseRateCents("-5"));
        assertThrows(IllegalArgumentException.class, () -> LisbonTimeUtils.parseRateCents("abc"));
        assertThrows(IllegalArgumentException.class, () -> LisbonTimeUtils.parseRateCents("20,123"));
    }
}
