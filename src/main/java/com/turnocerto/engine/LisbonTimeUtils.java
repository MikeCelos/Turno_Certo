package com.turnocerto.engine;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

public class LisbonTimeUtils {

    private static final ZoneId LISBON_ZONE = ZoneId.of("Europe/Lisbon");

    public static String lisbonTimestamp(String local, String occurrence) {
        if (local == null || !local.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$")) {
            throw new IllegalArgumentException("Preenche a data e a hora de entrada e saída.");
        }
        String datePart = local.substring(0, 10);
        if (!ShiftEngine.isValidIsoDate(datePart)) {
            throw new IllegalArgumentException("Data inválida ou hora inexistente em Lisboa devido à mudança da hora.");
        }

        List<String> candidates = new ArrayList<>();
        for (String offsetStr : List.of("+01:00", "+00:00")) {
            String candidate = local + offsetStr;
            try {
                OffsetDateTime odt = OffsetDateTime.parse(candidate);
                Instant instant = odt.toInstant();
                ZonedDateTime zdt = instant.atZone(LISBON_ZONE);
                String localFormatted = String.format("%04d-%02d-%02dT%02d:%02d",
                        zdt.getYear(), zdt.getMonthValue(), zdt.getDayOfMonth(),
                        zdt.getHour(), zdt.getMinute());
                if (localFormatted.equals(local)) {
                    candidates.add(candidate);
                }
            } catch (Exception ignored) {
            }
        }

        if (candidates.isEmpty()) {
            throw new IllegalArgumentException("Data inválida ou hora inexistente em Lisboa devido à mudança da hora.");
        }
        if (candidates.size() == 2 && !"first".equals(occurrence) && !"second".equals(occurrence)) {
            throw new IllegalArgumentException("Esta hora ocorre duas vezes. Em “Mudança da hora”, escolhe a primeira ou segunda ocorrência.");
        }
        return candidates.size() == 2 && "second".equals(occurrence) ? candidates.get(1) : candidates.get(0);
    }

    public static long parseRateCents(String rate) {
        if (rate == null || !rate.matches("^\\d{1,7}([.,]\\d{1,2})?$")) {
            throw new IllegalArgumentException("Indica um valor R positivo, com até duas casas decimais.");
        }
        String normalized = rate.replace(',', '.');
        String[] parts = normalized.split("\\.");
        long whole = Long.parseLong(parts[0]);
        long fraction = 0;
        if (parts.length > 1) {
            String fracStr = parts[1];
            if (fracStr.length() == 1) {
                fracStr = fracStr + "0";
            }
            fraction = Long.parseLong(fracStr);
        }
        long totalCents = whole * 100L + fraction;
        if (totalCents <= 0) {
            throw new IllegalArgumentException("Indica um valor R positivo, com até duas casas decimais.");
        }
        return totalCents;
    }
}
