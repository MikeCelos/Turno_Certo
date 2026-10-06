package com.turnocerto.model;

public class Shift {
    /** ISO com offset explícito, precisão de minutos: 2026-08-03T19:30+01:00. */
    private String start;
    private String end;
    private String regime;
    private String workType;
    /** R por tipo de trabalho, em cêntimos; nunca usar euros em ponto flutuante. */
    private long rateCents;
    /** Início do trabalho extraordinário para regime misto (ISO com offset). */
    private String extraStart;
    /** R para o regime normal em regime misto, em cêntimos (opcional, <= 0 usa rateCents). */
    private Long normalRateCents;
    /** Tipo de perfil: "hospital" ou "vmer". */
    private String profileType;

    public Shift() {}

    public Shift(String start, String end, String regime, String workType, long rateCents) {
        this(start, end, regime, workType, rateCents, null, null, null);
    }

    public Shift(String start, String end, String regime, String workType, long rateCents,
                 String extraStart, Long normalRateCents) {
        this(start, end, regime, workType, rateCents, extraStart, normalRateCents, null);
    }

    public Shift(String start, String end, String regime, String workType, long rateCents,
                 String extraStart, Long normalRateCents, String profileType) {
        this.start = start;
        this.end = end;
        this.regime = regime;
        this.workType = workType;
        this.rateCents = rateCents;
        this.extraStart = extraStart;
        this.normalRateCents = normalRateCents;
        this.profileType = profileType;
    }

    public String getStart() { return start; }
    public void setStart(String start) { this.start = start; }

    public String getEnd() { return end; }
    public void setEnd(String end) { this.end = end; }

    public String getRegime() { return regime; }
    public void setRegime(String regime) { this.regime = regime; }

    public String getWorkType() { return workType; }
    public void setWorkType(String workType) { this.workType = workType; }

    public long getRateCents() { return rateCents; }
    public void setRateCents(long rateCents) { this.rateCents = rateCents; }

    public String getExtraStart() { return extraStart; }
    public void setExtraStart(String extraStart) { this.extraStart = extraStart; }

    public Long getNormalRateCents() { return normalRateCents; }
    public void setNormalRateCents(Long normalRateCents) { this.normalRateCents = normalRateCents; }

    public String getProfileType() { return profileType; }
    public void setProfileType(String profileType) { this.profileType = profileType; }

    public boolean isVmer() {
        return "vmer".equalsIgnoreCase(profileType) || (workType != null && workType.toUpperCase().contains("VMER"));
    }
}
