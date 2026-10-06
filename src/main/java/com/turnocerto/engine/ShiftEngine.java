package com.turnocerto.engine;

import com.turnocerto.model.*;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.*;

public class ShiftEngine {

    private static final DateTimeFormatter STRICT_DATE = DateTimeFormatter.ofPattern("uuuu-MM-dd")
            .withResolverStyle(ResolverStyle.STRICT);

    public static boolean isValidIsoDate(String s) {
        if (s == null || !s.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            return false;
        }
        try {
            LocalDate.parse(s, STRICT_DATE);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    public static void validateProfile(Profile p) {
        if (p == null) {
            throw new IllegalArgumentException("Perfil não pode ser nulo.");
        }
        if (p.getFirstExtraMinutes() < 0 || p.getPaymentDelayMonths() < 0 || p.getIncludedNormal() < 0) {
            throw new IllegalArgumentException("Parâmetros do perfil inválidos.");
        }
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(p.getTimeZone());
        } catch (Exception e) {
            throw new IllegalArgumentException("Fuso horário inválido: " + p.getTimeZone());
        }

        if (p.getHolidays() != null) {
            for (String h : p.getHolidays()) {
                if (!isValidIsoDate(h)) {
                    throw new IllegalArgumentException("Data de feriado inválida.");
                }
            }
        }

        List<List<Window>> allSchedules = new ArrayList<>();
        allSchedules.add(p.getHoliday());
        for (int i = 0; i < 7; i++) {
            allSchedules.add(p.getWeek().get(i));
        }

        for (List<Window> ws : allSchedules) {
            if (ws == null || ws.isEmpty() || ws.get(0).fromMinute() != 0) {
                throw new IllegalArgumentException("Cada horário deve começar às 00:00.");
            }
            for (int i = 0; i < ws.size(); i++) {
                Window w = ws.get(i);
                if (w.fromMinute() < 0 || w.fromMinute() >= 1440 || (i > 0 && w.fromMinute() <= ws.get(i - 1).fromMinute())) {
                    throw new IllegalArgumentException("Fronteiras inválidas ou fora de ordem.");
                }
                CategoryRates c = p.getCoefficients().get(w.category());
                if (c == null) {
                    throw new IllegalArgumentException("Coeficiente inválido ou categoria sem coeficientes.");
                }
                if (c.normal() < p.getIncludedNormal()) {
                    throw new IllegalArgumentException("Coeficiente normal inferior ao valor incluído na base.");
                }
            }
        }
    }

    public static Instant parseTimestamp(String s, ZoneId zoneId) {
        if (s == null || !s.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$")) {
            throw new IllegalArgumentException("Usa data/hora ISO com offset explícito e precisão de minutos.");
        }
        String datePart = s.substring(0, 10);
        if (!isValidIsoDate(datePart)) {
            throw new IllegalArgumentException("Data/hora inválida.");
        }
        OffsetDateTime odt;
        try {
            odt = OffsetDateTime.parse(s);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Data/hora inválida.");
        }

        Instant instant = odt.toInstant();
        ZonedDateTime zdt = instant.atZone(zoneId);

        String localDate = zdt.toLocalDate().toString();
        int localMinute = zdt.getHour() * 60 + zdt.getMinute();

        int expectedMinute = Integer.parseInt(s.substring(11, 13)) * 60 + Integer.parseInt(s.substring(14, 16));
        if (!localDate.equals(datePart) || localMinute != expectedMinute) {
            throw new IllegalArgumentException("Hora ou offset incompatível com o fuso do perfil.");
        }
        return instant;
    }

    public static String paymentMonth(String date, int delay) {
        YearMonth ym = YearMonth.parse(date.substring(0, 7)).plusMonths(delay);
        return ym.toString();
    }

    public static long roundCents(long numerator) {
        return (numerator + 3000L) / 6000L;
    }

    public static ShiftCalculationResult calculateShift(Shift shift, Profile profile) {
        validateProfile(profile);

        if (shift == null) {
            throw new IllegalArgumentException("Turno não pode ser nulo.");
        }
        if (!"normal".equals(shift.getRegime()) && !"extra".equals(shift.getRegime()) && !"misto".equals(shift.getRegime())) {
            throw new IllegalArgumentException("Regime inválido.");
        }
        if (shift.getRateCents() <= 0) {
            throw new IllegalArgumentException("R deve ser um número inteiro positivo de cêntimos.");
        }
        if (shift.getNormalRateCents() != null && shift.getNormalRateCents() <= 0) {
            throw new IllegalArgumentException("R normal deve ser um número inteiro positivo de cêntimos.");
        }
        if (shift.getWorkType() == null || shift.getWorkType().trim().isEmpty()) {
            throw new IllegalArgumentException("Indica o tipo de trabalho.");
        }

        ZoneId zoneId = ZoneId.of(profile.getTimeZone());
        Instant start = parseTimestamp(shift.getStart(), zoneId);
        Instant end = parseTimestamp(shift.getEnd(), zoneId);

        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("A saída deve ser posterior à entrada.");
        }
        long durationMillis = Duration.between(start, end).toMillis();
        if (durationMillis > 31L * 86400000L) {
            throw new IllegalArgumentException("Um turno não pode exceder 31 dias nesta versão.");
        }

        Instant extraStartInstant = null;
        if ("misto".equals(shift.getRegime()) || shift.getExtraStart() != null) {
            if (shift.getExtraStart() == null || shift.getExtraStart().trim().isEmpty()) {
                throw new IllegalArgumentException("Indica a hora de início do trabalho extraordinário.");
            }
            extraStartInstant = parseTimestamp(shift.getExtraStart(), zoneId);
            if (!extraStartInstant.isAfter(start) || !extraStartInstant.isBefore(end)) {
                throw new IllegalArgumentException("A transição para extraordinário deve estar entre a entrada e a saída.");
            }
        }

        long normalRateCents = (shift.getNormalRateCents() != null && shift.getNormalRateCents() > 0)
                ? shift.getNormalRateCents()
                : shift.getRateCents();

        Set<String> holidays = new HashSet<>(profile.getHolidays());
        List<Segment> segments = new ArrayList<>();
        String previousKey = "";

        long startEpochMillis = start.toEpochMilli();
        long endEpochMillis = end.toEpochMilli();
        long extraStartEpoch = extraStartInstant != null ? extraStartInstant.toEpochMilli() : startEpochMillis;

        for (long t = startEpochMillis; t < endEpochMillis; t += 60000L) {
            Instant current = Instant.ofEpochMilli(t);
            ZonedDateTime localDt = current.atZone(zoneId);
            String date = localDt.toLocalDate().toString();
            int minute = localDt.getHour() * 60 + localDt.getMinute();
            int dayOfWeek = localDt.getDayOfWeek() == DayOfWeek.SUNDAY ? 0 : localDt.getDayOfWeek().getValue();

            List<Window> windows = holidays.contains(date) ? profile.getHoliday() : profile.getWeek().get(dayOfWeek);
            Window matched = null;
            for (Window w : windows) {
                if (w.fromMinute() <= minute) {
                    matched = w;
                } else {
                    break;
                }
            }
            if (matched == null) {
                throw new IllegalStateException("Nenhuma janela horária encontrada para o minuto: " + minute);
            }
            String category = matched.category();

            boolean isExtra = (extraStartInstant != null)
                    ? !current.isBefore(extraStartInstant)
                    : "extra".equals(shift.getRegime());
            String currentRegime = isExtra ? "extra" : "normal";
            long currentRateCents = isExtra ? shift.getRateCents() : normalRateCents;

            boolean firstExtra = isExtra && ((t - extraStartEpoch) / 60000L < profile.getFirstExtraMinutes());

            CategoryRates rates = profile.getCoefficients().get(category);
            int coefficient = isExtra
                    ? (firstExtra ? rates.firstExtra() : rates.nextExtra())
                    : rates.normal();

            int payableCoefficient = coefficient - (isExtra ? 0 : profile.getIncludedNormal());

            String payMonth = paymentMonth(date, profile.getPaymentDelayMonths());
            String key = payMonth + "|" + currentRegime + "|" + category + "|" + firstExtra + "|" + coefficient + "|" + currentRateCents;
            if (!key.equals(previousKey)) {
                Segment seg = new Segment(
                        current.toString(),
                        "",
                        date,
                        0,
                        category,
                        firstExtra,
                        coefficient,
                        payableCoefficient,
                        currentRateCents,
                        payMonth,
                        0L,
                        0L,
                        currentRegime
                );
                segments.add(seg);
                previousKey = key;
            }

            Segment segment = segments.get(segments.size() - 1);
            segment.setMinutes(segment.getMinutes() + 1);
            segment.setEnd(Instant.ofEpochMilli(t + 60000L).toString());
            segment.setNumerator(segment.getNumerator() + (currentRateCents * (long) payableCoefficient));
        }

        Map<String, Long> monthly = new LinkedHashMap<>();
        long totalNumerator = 0L;
        for (Segment s : segments) {
            s.setPayableCents(roundCents(s.getNumerator()));
            monthly.put(s.getPaymentMonth(), monthly.getOrDefault(s.getPaymentMonth(), 0L) + s.getNumerator());
            totalNumerator += s.getNumerator();
        }

        List<PaymentMonth> payments = new ArrayList<>();
        for (Map.Entry<String, Long> entry : monthly.entrySet()) {
            payments.add(new PaymentMonth(entry.getKey(), roundCents(entry.getValue())));
        }

        int totalMinutes = (int) ((endEpochMillis - startEpochMillis) / 60000L);
        long payableCents = roundCents(totalNumerator);

        return new ShiftCalculationResult(
                profile.getId(),
                profile.getVersion(),
                shift.getWorkType(),
                shift.getRegime(),
                profile.getTimeZone(),
                totalMinutes,
                payableCents,
                payments,
                segments
        );
    }

    private static String formatCoeff(int coeff) {
        if (coeff % 100 == 0) {
            return (coeff / 100) + " R";
        }
        return String.format(Locale.GERMAN, "%.2f R", coeff / 100.0);
    }

    private static String makeCategoryLabel(Segment seg) {
        if ("vmer".equals(seg.getRegime())) {
            if ("vmer-manha".equals(seg.getCategory())) {
                return "VMER Manhã (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            if ("vmer-tarde".equals(seg.getCategory())) {
                return "VMER Tarde (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            if ("vmer-noturno".equals(seg.getCategory())) {
                return "VMER Noturno (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            return "VMER (" + formatCoeff(seg.getCoefficient()) + ")";
        }
        if ("extra".equals(seg.getRegime())) {
            if (seg.isFirstExtra()) {
                return "1.ª Hora Extraordinária (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            if ("util-noturno".equals(seg.getCategory())) {
                return "Trabalho Supl. Noturno (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            if ("util-diurno".equals(seg.getCategory())) {
                return "Trabalho Supl. Diurno (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            if ("especial-noturno".equals(seg.getCategory())) {
                return "Trabalho Supl. Fim de Semana Noturno (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            if ("especial-diurno".equals(seg.getCategory())) {
                return "Trabalho Supl. Fim de Semana Diurno (" + formatCoeff(seg.getCoefficient()) + ")";
            }
            return "Trabalho Suplementar (" + formatCoeff(seg.getCoefficient()) + ")";
        } else {
            if (seg.getPayableCoefficient() == 0) {
                return "Regime Normal Diurno (incluído na remuneração base)";
            }
            String catName = seg.getCategory().contains("noturno") ? "Noturno" : "Fim de Semana";
            return "Suplemento Normal " + catName + " (" + formatCoeff(seg.getPayableCoefficient()) + ")";
        }
    }

    private static class AggregatedCategory {
        String label;
        String regime;
        String category;
        boolean firstExtra;
        int coefficient;
        int payableCoefficient;
        long rateCents;
        int minutes;
        long numerator;

        AggregatedCategory(String label, String regime, String category, boolean firstExtra,
                           int coefficient, int payableCoefficient, long rateCents) {
            this.label = label;
            this.regime = regime;
            this.category = category;
            this.firstExtra = firstExtra;
            this.coefficient = coefficient;
            this.payableCoefficient = payableCoefficient;
            this.rateCents = rateCents;
            this.minutes = 0;
            this.numerator = 0L;
        }
    }

    public static RosterCalculationResult calculateRoster(List<Shift> shifts, Profile profile) {
        return calculateRoster(shifts, profile, null);
    }

    public static RosterCalculationResult calculateRoster(List<Shift> shifts, Profile profile, com.turnocerto.dto.VmerConfigDto vmerConfig) {
        validateProfile(profile);
        if (shifts == null || shifts.isEmpty()) {
            throw new IllegalArgumentException("A lista de turnos não pode estar vazia.");
        }

        List<ShiftCalculationResult> shiftResults = new ArrayList<>();
        Map<String, AggregatedCategory> categoryMap = new LinkedHashMap<>();
        Map<String, Long> monthlyNumerator = new LinkedHashMap<>();
        int totalMinutes = 0;
        long totalNumerator = 0L;

        for (Shift s : shifts) {
            ShiftCalculationResult res = s.isVmer()
                    ? VmerShiftEngine.calculateShift(s, profile, vmerConfig)
                    : calculateShift(s, profile);
            shiftResults.add(res);
            totalMinutes += res.getTotalMinutes();

            for (Segment seg : res.getSegments()) {
                String label = makeCategoryLabel(seg);
                String aggKey = seg.getRegime() + "|" + seg.getCategory() + "|" + seg.isFirstExtra() + "|" + seg.getCoefficient() + "|" + seg.getRateCents();

                AggregatedCategory agg = categoryMap.computeIfAbsent(aggKey, k -> new AggregatedCategory(
                        label,
                        seg.getRegime(),
                        seg.getCategory(),
                        seg.isFirstExtra(),
                        seg.getCoefficient(),
                        seg.getPayableCoefficient(),
                        seg.getRateCents()
                ));
                agg.minutes += seg.getMinutes();
                agg.numerator += seg.getNumerator();

                monthlyNumerator.put(seg.getPaymentMonth(),
                        monthlyNumerator.getOrDefault(seg.getPaymentMonth(), 0L) + seg.getNumerator());
                totalNumerator += seg.getNumerator();
            }
        }

        List<CategorySummary> summaries = new ArrayList<>();
        for (AggregatedCategory agg : categoryMap.values()) {
            summaries.add(new CategorySummary(
                    agg.label,
                    agg.regime,
                    agg.category,
                    agg.firstExtra,
                    agg.coefficient,
                    agg.payableCoefficient,
                    agg.rateCents,
                    agg.minutes,
                    roundCents(agg.numerator)
            ));
        }

        List<PaymentMonth> payments = new ArrayList<>();
        for (Map.Entry<String, Long> entry : monthlyNumerator.entrySet()) {
            payments.add(new PaymentMonth(entry.getKey(), roundCents(entry.getValue())));
        }

        long payableCents = roundCents(totalNumerator);

        return new RosterCalculationResult(
                shifts.size(),
                totalMinutes,
                payableCents,
                summaries,
                payments,
                shiftResults
        );
    }
}
