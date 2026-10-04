package com.turnocerto.model;

public class Shift {
    /** ISO com offset explícito, precisão de minutos: 2026-08-03T19:30+01:00. */
    private String start;
    private String end;
    private String regime;
    private String workType;
    /** R por tipo de trabalho, em cêntimos; nunca usar euros em ponto flutuante. */
    private long rateCents;

    public Shift() {}

    public Shift(String start, String end, String regime, String workType, long rateCents) {
        this.start = start;
        this.end = end;
        this.regime = regime;
        this.workType = workType;
        this.rateCents = rateCents;
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
}
