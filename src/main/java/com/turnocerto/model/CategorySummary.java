package com.turnocerto.model;

public class CategorySummary {
    private String label;
    private String regime;
    private String category;
    private boolean firstExtra;
    private int coefficient;
    private int payableCoefficient;
    private long rateCents;
    private int totalMinutes;
    private long payableCents;

    public CategorySummary() {}

    public CategorySummary(String label, String regime, String category, boolean firstExtra,
                           int coefficient, int payableCoefficient, long rateCents,
                           int totalMinutes, long payableCents) {
        this.label = label;
        this.regime = regime;
        this.category = category;
        this.firstExtra = firstExtra;
        this.coefficient = coefficient;
        this.payableCoefficient = payableCoefficient;
        this.rateCents = rateCents;
        this.totalMinutes = totalMinutes;
        this.payableCents = payableCents;
    }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getRegime() { return regime; }
    public void setRegime(String regime) { this.regime = regime; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public boolean isFirstExtra() { return firstExtra; }
    public void setFirstExtra(boolean firstExtra) { this.firstExtra = firstExtra; }

    public int getCoefficient() { return coefficient; }
    public void setCoefficient(int coefficient) { this.coefficient = coefficient; }

    public int getPayableCoefficient() { return payableCoefficient; }
    public void setPayableCoefficient(int payableCoefficient) { this.payableCoefficient = payableCoefficient; }

    public long getRateCents() { return rateCents; }
    public void setRateCents(long rateCents) { this.rateCents = rateCents; }

    public int getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(int totalMinutes) { this.totalMinutes = totalMinutes; }

    public long getPayableCents() { return payableCents; }
    public void setPayableCents(long payableCents) { this.payableCents = payableCents; }
}
