package com.turnocerto.model;

public class Segment {
    private String start;
    private String end;
    private String localDate;
    private int minutes;
    private String category;
    private boolean firstExtra;
    private int coefficient;
    private int payableCoefficient;
    private long rateCents;
    private String paymentMonth;
    /** Numerador exato em unidades de 1/6000 de cêntimo. */
    private long numerator;
    private long payableCents;

    public Segment() {}

    public Segment(String start, String end, String localDate, int minutes, String category,
                   boolean firstExtra, int coefficient, int payableCoefficient, long rateCents,
                   String paymentMonth, long numerator, long payableCents) {
        this.start = start;
        this.end = end;
        this.localDate = localDate;
        this.minutes = minutes;
        this.category = category;
        this.firstExtra = firstExtra;
        this.coefficient = coefficient;
        this.payableCoefficient = payableCoefficient;
        this.rateCents = rateCents;
        this.paymentMonth = paymentMonth;
        this.numerator = numerator;
        this.payableCents = payableCents;
    }

    public String getStart() { return start; }
    public void setStart(String start) { this.start = start; }

    public String getEnd() { return end; }
    public void setEnd(String end) { this.end = end; }

    public String getLocalDate() { return localDate; }
    public void setLocalDate(String localDate) { this.localDate = localDate; }

    public int getMinutes() { return minutes; }
    public void setMinutes(int minutes) { this.minutes = minutes; }

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

    public String getPaymentMonth() { return paymentMonth; }
    public void setPaymentMonth(String paymentMonth) { this.paymentMonth = paymentMonth; }

    public long getNumerator() { return numerator; }
    public void setNumerator(long numerator) { this.numerator = numerator; }

    public long getPayableCents() { return payableCents; }
    public void setPayableCents(long payableCents) { this.payableCents = payableCents; }
}
