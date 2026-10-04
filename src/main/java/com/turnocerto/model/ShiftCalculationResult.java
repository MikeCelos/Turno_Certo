package com.turnocerto.model;

import java.util.List;

public class ShiftCalculationResult {
    private String profileId;
    private int profileVersion;
    private String workType;
    private String regime;
    private String timeZone;
    private int totalMinutes;
    private long payableCents;
    private List<PaymentMonth> payments;
    private List<Segment> segments;

    public ShiftCalculationResult() {}

    public ShiftCalculationResult(String profileId, int profileVersion, String workType,
                                  String regime, String timeZone, int totalMinutes,
                                  long payableCents, List<PaymentMonth> payments,
                                  List<Segment> segments) {
        this.profileId = profileId;
        this.profileVersion = profileVersion;
        this.workType = workType;
        this.regime = regime;
        this.timeZone = timeZone;
        this.totalMinutes = totalMinutes;
        this.payableCents = payableCents;
        this.payments = payments;
        this.segments = segments;
    }

    public String getProfileId() { return profileId; }
    public void setProfileId(String profileId) { this.profileId = profileId; }

    public int getProfileVersion() { return profileVersion; }
    public void setProfileVersion(int profileVersion) { this.profileVersion = profileVersion; }

    public String getWorkType() { return workType; }
    public void setWorkType(String workType) { this.workType = workType; }

    public String getRegime() { return regime; }
    public void setRegime(String regime) { this.regime = regime; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }

    public int getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(int totalMinutes) { this.totalMinutes = totalMinutes; }

    public long getPayableCents() { return payableCents; }
    public void setPayableCents(long payableCents) { this.payableCents = payableCents; }

    public List<PaymentMonth> getPayments() { return payments; }
    public void setPayments(List<PaymentMonth> payments) { this.payments = payments; }

    public List<Segment> getSegments() { return segments; }
    public void setSegments(List<Segment> segments) { this.segments = segments; }
}
