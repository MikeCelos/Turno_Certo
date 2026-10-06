package com.turnocerto.dto;

import java.util.Map;

public class VmerConfigDto {
    private String baseRate;
    private String mode; // "multipliers" or "hourly"
    private Map<String, Integer> multipliers;

    public VmerConfigDto() {}

    public VmerConfigDto(String baseRate, String mode, Map<String, Integer> multipliers) {
        this.baseRate = baseRate;
        this.mode = mode;
        this.multipliers = multipliers;
    }

    public String getBaseRate() {
        return baseRate;
    }

    public void setBaseRate(String baseRate) {
        this.baseRate = baseRate;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public Map<String, Integer> getMultipliers() {
        return multipliers;
    }

    public void setMultipliers(Map<String, Integer> multipliers) {
        this.multipliers = multipliers;
    }
}
