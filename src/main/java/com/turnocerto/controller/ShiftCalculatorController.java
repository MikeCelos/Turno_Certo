package com.turnocerto.controller;

import com.turnocerto.dto.CalculateRequest;
import com.turnocerto.dto.CategoryRatesDto;
import com.turnocerto.engine.LisbonTimeUtils;
import com.turnocerto.engine.ShiftEngine;
import com.turnocerto.model.CategoryRates;
import com.turnocerto.model.Profile;
import com.turnocerto.model.Shift;
import com.turnocerto.model.ShiftCalculationResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ShiftCalculatorController {

    private Map<String, CategoryRates> parseCustomRates(Map<String, CategoryRatesDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return null;
        }
        Map<String, CategoryRates> map = new HashMap<>();
        for (Map.Entry<String, CategoryRatesDto> entry : dtos.entrySet()) {
            CategoryRatesDto dto = entry.getValue();
            if (dto != null && dto.getNormal() != null && dto.getFirstExtra() != null && dto.getNextExtra() != null) {
                map.put(entry.getKey(), new CategoryRates(dto.getNormal(), dto.getFirstExtra(), dto.getNextExtra()));
            }
        }
        return map;
    }

    @PostMapping("/calculate")
    public ResponseEntity<ShiftCalculationResult> calculate(@RequestBody CalculateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Pedido inválido.");
        }
        if (request.getHolidays() != null && request.getHolidays().size() > 500) {
            throw new IllegalArgumentException("Lista de feriados inválida.");
        }

        String start = LisbonTimeUtils.lisbonTimestamp(request.getStart(), request.getStartOccurrence());
        String end = LisbonTimeUtils.lisbonTimestamp(request.getEnd(), request.getEndOccurrence());
        long rateCents = LisbonTimeUtils.parseRateCents(request.getRate());

        String extraStart = null;
        if (request.getExtraStart() != null && !request.getExtraStart().trim().isEmpty()) {
            extraStart = LisbonTimeUtils.lisbonTimestamp(request.getExtraStart(), request.getExtraStartOccurrence());
        }

        Long normalRateCents = null;
        if (request.getNormalRate() != null && !request.getNormalRate().trim().isEmpty()) {
            normalRateCents = LisbonTimeUtils.parseRateCents(request.getNormalRate());
        }

        Shift shift = new Shift(start, end, request.getRegime(), request.getWorkType(), rateCents, extraStart, normalRateCents);
        Map<String, CategoryRates> customRates = parseCustomRates(request.getCustomCoefficients());
        Profile profile = Profile.profileWithCoefficients(request.getHolidays(), customRates);

        ShiftCalculationResult result = ShiftEngine.calculateShift(shift, profile);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/calculate-roster")
    public ResponseEntity<com.turnocerto.model.RosterCalculationResult> calculateRoster(@RequestBody com.turnocerto.dto.CalculateRosterRequest request) {
        if (request == null || request.getShifts() == null || request.getShifts().isEmpty()) {
            throw new IllegalArgumentException("A lista de turnos não pode estar vazia.");
        }
        if (request.getShifts().size() > 200) {
            throw new IllegalArgumentException("Máximo de 200 turnos excedido.");
        }
        if (request.getHolidays() != null && request.getHolidays().size() > 500) {
            throw new IllegalArgumentException("Lista de feriados inválida.");
        }

        java.util.List<Shift> shifts = new java.util.ArrayList<>();
        for (CalculateRequest item : request.getShifts()) {
            String start = LisbonTimeUtils.lisbonTimestamp(item.getStart(), item.getStartOccurrence());
            String end = LisbonTimeUtils.lisbonTimestamp(item.getEnd(), item.getEndOccurrence());
            long rateCents = LisbonTimeUtils.parseRateCents(item.getRate());

            String extraStart = null;
            if (item.getExtraStart() != null && !item.getExtraStart().trim().isEmpty()) {
                extraStart = LisbonTimeUtils.lisbonTimestamp(item.getExtraStart(), item.getExtraStartOccurrence());
            }

            Long normalRateCents = null;
            if (item.getNormalRate() != null && !item.getNormalRate().trim().isEmpty()) {
                normalRateCents = LisbonTimeUtils.parseRateCents(item.getNormalRate());
            }

            shifts.add(new Shift(start, end, item.getRegime(), item.getWorkType(), rateCents, extraStart, normalRateCents));
        }

        Map<String, CategoryRates> customRates = parseCustomRates(request.getCustomCoefficients());
        Profile profile = Profile.profileWithCoefficients(request.getHolidays(), customRates);
        com.turnocerto.model.RosterCalculationResult result = ShiftEngine.calculateRoster(shifts, profile);
        return ResponseEntity.ok(result);
    }
}
