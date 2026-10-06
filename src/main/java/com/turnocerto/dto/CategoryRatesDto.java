package com.turnocerto.dto;

public class CategoryRatesDto {
    private Integer normal;
    private Integer firstExtra;
    private Integer nextExtra;

    public CategoryRatesDto() {}

    public CategoryRatesDto(Integer normal, Integer firstExtra, Integer nextExtra) {
        this.normal = normal;
        this.firstExtra = firstExtra;
        this.nextExtra = nextExtra;
    }

    public Integer getNormal() {
        return normal;
    }

    public void setNormal(Integer normal) {
        this.normal = normal;
    }

    public Integer getFirstExtra() {
        return firstExtra;
    }

    public void setFirstExtra(Integer firstExtra) {
        this.firstExtra = firstExtra;
    }

    public Integer getNextExtra() {
        return nextExtra;
    }

    public void setNextExtra(Integer nextExtra) {
        this.nextExtra = nextExtra;
    }
}
