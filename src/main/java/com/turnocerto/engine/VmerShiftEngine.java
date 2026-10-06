package com.turnocerto.engine;

import com.turnocerto.dto.VmerConfigDto;
import com.turnocerto.model.*;

import java.time.*;
import java.util.*;

public class VmerShiftEngine {

    // Multiplicadores padrão em centésimos (100 = 1.00 R)
    public static final int DEFAULT_UTIL_08_15 = 700;
    public static final int DEFAULT_UTIL_15_22 = 800;
    public static final int DEFAULT_UTIL_22_08 = 1500;
    public static final int DEFAULT_VESP_FERIADO_22_08 = 1900;
    public static final int DEFAULT_SAB_08_15 = 800;
    public static final int DEFAULT_SAB_15_22 = 1150;
    public static final int DEFAULT_SAB_22_08 = 2000;
    public static final int DEFAULT_DOM_08_15 = 1050;
    public static final int DEFAULT_DOM_15_22 = 1150;
    public static final int DEFAULT_DOM_22_08 = 1600;
    public static final int DEFAULT_DOM_VESP_FERIADO_22_08 = 2000;

    public static final long DEFAULT_BASE_RATE_CENTS = 2991L; // 29,91 €

    private enum VmerSlot {
        MANHA(480, 900, 420, "VMER Manhã", "vmer-manha"),       // 08:00 - 15:00 (7h)
        TARDE(900, 1320, 420, "VMER Tarde", "vmer-tarde"),      // 15:00 - 22:00 (7h)
        NOITE(1320, 480, 600, "VMER Noturno", "vmer-noturno");  // 22:00 - 08:00 (10h)

        final int fromMinute;
        final int toMinute;
        final int totalSlotMinutes;
        final String label;
        final String categoryKey;

        VmerSlot(int fromMinute, int toMinute, int totalSlotMinutes, String label, String categoryKey) {
            this.fromMinute = fromMinute;
            this.toMinute = toMinute;
            this.totalSlotMinutes = totalSlotMinutes;
            this.label = label;
            this.categoryKey = categoryKey;
        }
    }

    private enum DayKind {
        DIA_UTIL,
        VESPERA_FERIADO,
        SABADO,
        DOMINGO,
        DOMINGO_VESP_FERIADO
    }

    public static ShiftCalculationResult calculateShift(Shift shift, Profile profile, VmerConfigDto vmerConfig) {
        ZoneId zoneId = ZoneId.of(profile.getTimeZone() != null ? profile.getTimeZone() : "Europe/Lisbon");
        Instant start = ShiftEngine.parseTimestamp(shift.getStart(), zoneId);
        Instant end = ShiftEngine.parseTimestamp(shift.getEnd(), zoneId);

        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("O horário de saída deve ser posterior à entrada.");
        }
        if (Duration.between(start, end).toHours() > 36) {
            throw new IllegalArgumentException("O turno não pode exceder 36 horas.");
        }

        long baseRateCents = shift.getRateCents() > 0 ? shift.getRateCents() : DEFAULT_BASE_RATE_CENTS;
        if (vmerConfig != null && vmerConfig.getBaseRate() != null && !vmerConfig.getBaseRate().trim().isEmpty()) {
            baseRateCents = LisbonTimeUtils.parseRateCents(vmerConfig.getBaseRate());
        }

        boolean isHourlyMode = vmerConfig != null && "hourly".equalsIgnoreCase(vmerConfig.getMode());
        Map<String, Integer> multipliers = getResolvedMultipliers(vmerConfig);
        Set<String> holidays = new HashSet<>(profile.getHolidays());

        List<Segment> segments = new ArrayList<>();
        long startEpochMillis = start.toEpochMilli();
        long endEpochMillis = end.toEpochMilli();

        String prevKey = "";
        long totalNumerator = 0L;
        Map<String, Long> monthlyNumerator = new TreeMap<>();

        for (long t = startEpochMillis; t < endEpochMillis; t += 60000L) {
            Instant current = Instant.ofEpochMilli(t);
            ZonedDateTime localDt = current.atZone(zoneId);
            LocalDate curDate = localDt.toLocalDate();
            int minuteOfDay = localDt.getHour() * 60 + localDt.getMinute();

            LocalDate opDate;
            VmerSlot slot;
            if (minuteOfDay >= 480 && minuteOfDay < 900) {
                opDate = curDate;
                slot = VmerSlot.MANHA;
            } else if (minuteOfDay >= 900 && minuteOfDay < 1320) {
                opDate = curDate;
                slot = VmerSlot.TARDE;
            } else if (minuteOfDay >= 1320) {
                opDate = curDate;
                slot = VmerSlot.NOITE;
            } else { // 00:00 até 07:59 pertence à noite iniciada no dia anterior
                opDate = curDate.minusDays(1);
                slot = VmerSlot.NOITE;
            }

            DayKind dayKind = resolveDayKind(opDate, holidays);
            int slotMultiplier = isHourlyMode
                    ? (slot.totalSlotMinutes / 60) * 100
                    : getSlotMultiplier(dayKind, slot, multipliers);
            String payMonth = ShiftEngine.paymentMonth(opDate.toString(), profile.getPaymentDelayMonths());
            String key = payMonth + "|" + opDate + "|" + slot.name() + "|" + dayKind.name() + "|" + slotMultiplier;

            if (!key.equals(prevKey)) {
                Segment seg = new Segment(
                        current.toString(),
                        "",
                        opDate.toString(),
                        0,
                        slot.categoryKey,
                        false,
                        slotMultiplier,
                        slotMultiplier,
                        baseRateCents,
                        payMonth,
                        0L,
                        0L,
                        "vmer"
                );
                segments.add(seg);
                prevKey = key;
            }

            Segment lastSeg = segments.get(segments.size() - 1);
            lastSeg.setEnd(current.plusSeconds(60).toString());
            lastSeg.setMinutes(lastSeg.getMinutes() + 1);
        }

        for (Segment seg : segments) {
            VmerSlot slot = VmerSlot.MANHA;
            for (VmerSlot s : VmerSlot.values()) {
                if (s.categoryKey.equals(seg.getCategory())) {
                    slot = s;
                    break;
                }
            }
            if (seg.getMinutes() == slot.totalSlotMinutes) {
                seg.setNumerator((long) seg.getCoefficient() * baseRateCents * 60L);
            } else {
                seg.setNumerator((long) seg.getMinutes() * seg.getCoefficient() * baseRateCents * 60L / slot.totalSlotMinutes);
            }
            seg.setPayableCents(ShiftEngine.roundCents(seg.getNumerator()));
            monthlyNumerator.put(seg.getPaymentMonth(),
                    monthlyNumerator.getOrDefault(seg.getPaymentMonth(), 0L) + seg.getNumerator());
            totalNumerator += seg.getNumerator();
        }

        List<PaymentMonth> payments = new ArrayList<>();
        for (Map.Entry<String, Long> entry : monthlyNumerator.entrySet()) {
            payments.add(new PaymentMonth(entry.getKey(), ShiftEngine.roundCents(entry.getValue())));
        }

        int totalMinutes = (int) ((endEpochMillis - startEpochMillis) / 60000L);
        long payableCents = ShiftEngine.roundCents(totalNumerator);

        return new ShiftCalculationResult(
                "vmer-profile",
                1,
                shift.getWorkType() != null ? shift.getWorkType() : "VMER",
                "vmer",
                profile.getTimeZone(),
                totalMinutes,
                payableCents,
                payments,
                segments
        );
    }

    private static DayKind resolveDayKind(LocalDate opDate, Set<String> holidays) {
        boolean isHoliday = holidays.contains(opDate.toString());
        boolean nextIsHoliday = holidays.contains(opDate.plusDays(1).toString());
        DayOfWeek dow = opDate.getDayOfWeek();

        if (isHoliday) {
            return nextIsHoliday ? DayKind.DOMINGO_VESP_FERIADO : DayKind.DOMINGO;
        }
        if (dow == DayOfWeek.SUNDAY) {
            return nextIsHoliday ? DayKind.DOMINGO_VESP_FERIADO : DayKind.DOMINGO;
        }
        if (dow == DayOfWeek.SATURDAY) {
            return DayKind.SABADO;
        }
        // Segunda a Sexta
        return nextIsHoliday ? DayKind.VESPERA_FERIADO : DayKind.DIA_UTIL;
    }

    private static int getSlotMultiplier(DayKind dayKind, VmerSlot slot, Map<String, Integer> map) {
        switch (dayKind) {
            case DIA_UTIL:
                if (slot == VmerSlot.MANHA) return map.getOrDefault("util_08_15", DEFAULT_UTIL_08_15);
                if (slot == VmerSlot.TARDE) return map.getOrDefault("util_15_22", DEFAULT_UTIL_15_22);
                return map.getOrDefault("util_22_08", DEFAULT_UTIL_22_08);
            case VESPERA_FERIADO:
                if (slot == VmerSlot.MANHA) return map.getOrDefault("util_08_15", DEFAULT_UTIL_08_15);
                if (slot == VmerSlot.TARDE) return map.getOrDefault("util_15_22", DEFAULT_UTIL_15_22);
                return map.getOrDefault("vesp_feriado_22_08", DEFAULT_VESP_FERIADO_22_08);
            case SABADO:
                if (slot == VmerSlot.MANHA) return map.getOrDefault("sab_08_15", DEFAULT_SAB_08_15);
                if (slot == VmerSlot.TARDE) return map.getOrDefault("sab_15_22", DEFAULT_SAB_15_22);
                return map.getOrDefault("sab_22_08", DEFAULT_SAB_22_08);
            case DOMINGO:
                if (slot == VmerSlot.MANHA) return map.getOrDefault("dom_08_15", DEFAULT_DOM_08_15);
                if (slot == VmerSlot.TARDE) return map.getOrDefault("dom_15_22", DEFAULT_DOM_15_22);
                return map.getOrDefault("dom_22_08", DEFAULT_DOM_22_08);
            case DOMINGO_VESP_FERIADO:
                if (slot == VmerSlot.MANHA) return map.getOrDefault("dom_08_15", DEFAULT_DOM_08_15);
                if (slot == VmerSlot.TARDE) return map.getOrDefault("dom_15_22", DEFAULT_DOM_15_22);
                return map.getOrDefault("dom_vesp_feriado_22_08", DEFAULT_DOM_VESP_FERIADO_22_08);
            default:
                return 700;
        }
    }

    private static Map<String, Integer> getResolvedMultipliers(VmerConfigDto config) {
        Map<String, Integer> map = new HashMap<>();
        map.put("util_08_15", DEFAULT_UTIL_08_15);
        map.put("util_15_22", DEFAULT_UTIL_15_22);
        map.put("util_22_08", DEFAULT_UTIL_22_08);
        map.put("vesp_feriado_22_08", DEFAULT_VESP_FERIADO_22_08);
        map.put("sab_08_15", DEFAULT_SAB_08_15);
        map.put("sab_15_22", DEFAULT_SAB_15_22);
        map.put("sab_22_08", DEFAULT_SAB_22_08);
        map.put("dom_08_15", DEFAULT_DOM_08_15);
        map.put("dom_15_22", DEFAULT_DOM_15_22);
        map.put("dom_22_08", DEFAULT_DOM_22_08);
        map.put("dom_vesp_feriado_22_08", DEFAULT_DOM_VESP_FERIADO_22_08);

        if (config != null && config.getMultipliers() != null) {
            map.putAll(config.getMultipliers());
        }
        return map;
    }
}
