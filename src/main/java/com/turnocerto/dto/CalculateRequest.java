package com.turnocerto.dto;

import java.util.ArrayList;
import java.util.List;

public class CalculateRequest {
    private String workType;
    private String regime;
    private String start;
    private String end;
    private String startOccurrence;
    private String endOccurrence;
    private String rate;
    private List<String> holidays = new ArrayList<>();

    public CalculateRequest() {}

    public CalculateRequest(String workType, String regime, String start, String end,
                            String startOccurrence, String endOccurrence, String rate,
                            List<String> holidays) {
        this.workType = workType;
        this.regime = regime;
        this.start = start;
        this.end = end;
        this.startOccurrence = startOccurrence;
        this.endOccurrence = endOccurrence;
        this.rate = rate;
        this.holidays = holidays != null ? holidays : new ArrayList<>();
    }

    public String getWorkType() { return workType; }
    public void setWorkType(String workType) { this.workType = workType; }

    public String getRegime() { return regime; }
    public void setRegime(String regime) { this.regime = regime; }

    public String getStart() { return start; }
    public void setStart(String start) { this.start = start; }

    public String getEnd() { return end; }
    public void setEnd(String end) { this.end = end; }

    public String getStartOccurrence() { return startOccurrence; }
    public void setStartOccurrence(String startOccurrence) { this.startOccurrence = startOccurrence; }

    public String getEndOccurrence() { return endOccurrence; }
    public void setEndOccurrence(String endOccurrence) { this.endOccurrence = endOccurrence; }

    public String getRate() { return rate; }
    public void setRate(String rate) { this.rate = rate; }

    public List<String> getHolidays() { return holidays; }
    public void setHolidays(List<String> holidays) { this.holidays = holidays != null ? holidays : new ArrayList<>(); }
}
