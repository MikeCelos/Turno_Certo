package com.turnocerto.model;

import java.util.*;

public class Profile {
    private String id;
    private int version;
    private String timeZone;
    /** Domingo = 0; sábado = 6. Cada dia começa no minuto 0. */
    private Map<Integer, List<Window>> week;
    private List<Window> holiday;
    private List<String> holidays;
    private Map<String, CategoryRates> coefficients;
    /** Coeficientes inteiros em centésimos: 150 significa 1,5 R. */
    private int includedNormal;
    private int firstExtraMinutes;
    private int paymentDelayMonths;

    public Profile() {
        this.week = new HashMap<>();
        this.holiday = new ArrayList<>();
        this.holidays = new ArrayList<>();
        this.coefficients = new HashMap<>();
    }

    public Profile(String id, int version, String timeZone, Map<Integer, List<Window>> week,
                   List<Window> holiday, List<String> holidays, Map<String, CategoryRates> coefficients,
                   int includedNormal, int firstExtraMinutes, int paymentDelayMonths) {
        this.id = id;
        this.version = version;
        this.timeZone = timeZone;
        this.week = new HashMap<>(week);
        this.holiday = new ArrayList<>(holiday);
        this.holidays = holidays != null ? new ArrayList<>(holidays) : new ArrayList<>();
        this.coefficients = new HashMap<>(coefficients);
        this.includedNormal = includedNormal;
        this.firstExtraMinutes = firstExtraMinutes;
        this.paymentDelayMonths = paymentDelayMonths;
    }

    public static Profile initialProfile() {
        return initialProfile(Collections.emptyList());
    }

    public static Profile initialProfile(List<String> holidays) {
        List<Window> weekday = List.of(
            new Window(0, "util-noturno"),
            new Window(480, "util-diurno"),
            new Window(1200, "util-noturno")
        );

        List<Window> special = List.of(
            new Window(0, "especial-noturno"),
            new Window(480, "especial-diurno"),
            new Window(1200, "especial-noturno")
        );

        List<Window> saturday = List.of(
            new Window(0, "util-noturno"),
            new Window(480, "util-diurno"),
            new Window(780, "especial-diurno"),
            new Window(1200, "especial-noturno")
        );

        Map<Integer, List<Window>> week = new HashMap<>();
        week.put(0, new ArrayList<>(special));
        week.put(1, new ArrayList<>(weekday));
        week.put(2, new ArrayList<>(weekday));
        week.put(3, new ArrayList<>(weekday));
        week.put(4, new ArrayList<>(weekday));
        week.put(5, new ArrayList<>(weekday));
        week.put(6, new ArrayList<>(saturday));

        Map<String, CategoryRates> coefficients = new HashMap<>();
        coefficients.put("util-diurno", new CategoryRates(100, 125, 150));
        coefficients.put("util-noturno", new CategoryRates(150, 175, 200));
        coefficients.put("especial-diurno", new CategoryRates(150, 175, 200));
        coefficients.put("especial-noturno", new CategoryRates(200, 225, 250));

        return new Profile(
            "perfil-inicial",
            1,
            "Europe/Lisbon",
            week,
            new ArrayList<>(special),
            holidays != null ? new ArrayList<>(holidays) : new ArrayList<>(),
            coefficients,
            100,
            60,
            2
        );
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

    public Map<Integer, List<Window>> getWeek() { return week; }
    public void setWeek(Map<Integer, List<Window>> week) { this.week = week; }

    public List<Window> getHoliday() { return holiday; }
    public void setHoliday(List<Window> holiday) { this.holiday = holiday; }

    public List<String> getHolidays() { return holidays; }
    public void setHolidays(List<String> holidays) { this.holidays = holidays; }

    public Map<String, CategoryRates> getCoefficients() { return coefficients; }
    public void setCoefficients(Map<String, CategoryRates> coefficients) { this.coefficients = coefficients; }

    public int getIncludedNormal() { return includedNormal; }
    public void setIncludedNormal(int includedNormal) { this.includedNormal = includedNormal; }

    public int getFirstExtraMinutes() { return firstExtraMinutes; }
    public void setFirstExtraMinutes(int firstExtraMinutes) { this.firstExtraMinutes = firstExtraMinutes; }

    public int getPaymentDelayMonths() { return paymentDelayMonths; }
    public void setPaymentDelayMonths(int paymentDelayMonths) { this.paymentDelayMonths = paymentDelayMonths; }
}
