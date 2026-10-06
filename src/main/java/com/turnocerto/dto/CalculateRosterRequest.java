package com.turnocerto.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class CalculateRosterRequest {
    private List<CalculateRequest> shifts = new ArrayList<>();
    private List<String> holidays = new ArrayList<>();
    private Map<String, CategoryRatesDto> customCoefficients;

    public CalculateRosterRequest() {}

    public CalculateRosterRequest(List<CalculateRequest> shifts, List<String> holidays) {
        this.shifts = shifts != null ? shifts : new ArrayList<>();
        this.holidays = holidays != null ? holidays : new ArrayList<>();
    }

    public List<CalculateRequest> getShifts() { return shifts; }
    public void setShifts(List<CalculateRequest> shifts) { this.shifts = shifts != null ? shifts : new ArrayList<>(); }

    public List<String> getHolidays() { return holidays; }
    public void setHolidays(List<String> holidays) { this.holidays = holidays != null ? holidays : new ArrayList<>(); }

    public Map<String, CategoryRatesDto> getCustomCoefficients() { return customCoefficients; }
    public void setCustomCoefficients(Map<String, CategoryRatesDto> customCoefficients) { this.customCoefficients = customCoefficients; }
}
