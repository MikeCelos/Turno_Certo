package com.turnocerto.model;

import java.util.List;

public class RosterCalculationResult {
    private int totalShifts;
    private int totalMinutes;
    private long payableCents;
    private List<CategorySummary> categorySummaries;
    private List<PaymentMonth> payments;
    private List<ShiftCalculationResult> shifts;

    public RosterCalculationResult() {}

    public RosterCalculationResult(int totalShifts, int totalMinutes, long payableCents,
                                   List<CategorySummary> categorySummaries,
                                   List<PaymentMonth> payments,
                                   List<ShiftCalculationResult> shifts) {
        this.totalShifts = totalShifts;
        this.totalMinutes = totalMinutes;
        this.payableCents = payableCents;
        this.categorySummaries = categorySummaries;
        this.payments = payments;
        this.shifts = shifts;
    }

    public int getTotalShifts() { return totalShifts; }
    public void setTotalShifts(int totalShifts) { this.totalShifts = totalShifts; }

    public int getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(int totalMinutes) { this.totalMinutes = totalMinutes; }

    public long getPayableCents() { return payableCents; }
    public void setPayableCents(long payableCents) { this.payableCents = payableCents; }

    public List<CategorySummary> getCategorySummaries() { return categorySummaries; }
    public void setCategorySummaries(List<CategorySummary> categorySummaries) { this.categorySummaries = categorySummaries; }

    public List<PaymentMonth> getPayments() { return payments; }
    public void setPayments(List<PaymentMonth> payments) { this.payments = payments; }

    public List<ShiftCalculationResult> getShifts() { return shifts; }
    public void setShifts(List<ShiftCalculationResult> shifts) { this.shifts = shifts; }
}
