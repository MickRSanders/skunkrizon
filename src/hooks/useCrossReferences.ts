import { useMemo } from "react";
import { useCalculations, useAllCalculationFields, type Calculation } from "./useCalculations";
import { usePolicies, type Policy } from "./usePolicies";

export interface FieldUsage {
  calculations: { id: string; name: string }[];
  policyBenefits: { id: string; policyName: string; componentName: string }[];
}

export interface CalcUsage {
  policies: { id: string; policyName: string; componentName: string }[];
}

/**
 * For each field_library field (by name), find:
 *  - calculations whose formula references the field name
 *  - policy benefit_components that link to a calculation using that field
 */
export function useFieldUsageMap() {
  const { data: calculations } = useCalculations();
  const { data: allFields } = useAllCalculationFields();
  const { data: policies } = usePolicies();

  return useMemo(() => {
    const map = new Map<string, FieldUsage>();

    const getOrCreate = (name: string): FieldUsage => {
      if (!map.has(name)) map.set(name, { calculations: [], policyBenefits: [] });
      return map.get(name)!;
    };

    // Build a map: calcFieldName -> calculationIds that use it
    const fieldNameToCalcIds = new Map<string, Set<string>>();
    (allFields ?? []).forEach((f) => {
      if (!fieldNameToCalcIds.has(f.name)) fieldNameToCalcIds.set(f.name, new Set());
      fieldNameToCalcIds.get(f.name)!.add(f.calculation_id);
    });

    // Also check formulas for field name references
    (calculations ?? []).forEach((calc) => {
      if (!calc.formula) return;
      (allFields ?? []).forEach((f) => {
        // Check if field name appears in formula as a word boundary match
        const regex = new RegExp(`\\b${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (regex.test(calc.formula)) {
          if (!fieldNameToCalcIds.has(f.name)) fieldNameToCalcIds.set(f.name, new Set());
          fieldNameToCalcIds.get(f.name)!.add(calc.id);
        }
      });
    });

    // Map field names to calculation names
    const calcMap = new Map((calculations ?? []).map((c) => [c.id, c]));
    fieldNameToCalcIds.forEach((calcIds, fieldName) => {
      const usage = getOrCreate(fieldName);
      calcIds.forEach((cid) => {
        const calc = calcMap.get(cid);
        if (calc && !usage.calculations.some((c) => c.id === cid)) {
          usage.calculations.push({ id: cid, name: calc.name });
        }
      });
    });

    // Find policy benefit_components that reference calculations containing these fields
    (policies ?? []).forEach((policy) => {
      const components = parseBenefitComponents(policy.benefit_components);
      components.forEach((comp) => {
        if (!comp.calculationId) return;
        // Find which field names are in this calculation
        (allFields ?? [])
          .filter((f) => f.calculation_id === comp.calculationId)
          .forEach((f) => {
            const usage = getOrCreate(f.name);
            usage.policyBenefits.push({
              id: policy.id,
              policyName: policy.name,
              componentName: comp.name,
            });
          });
      });
    });

    return map;
  }, [calculations, allFields, policies]);
}

/**
 * For each calculation, find policies whose benefit_components link to it.
 */
export function useCalcUsageMap() {
  const { data: policies } = usePolicies();

  return useMemo(() => {
    const map = new Map<string, CalcUsage>();

    (policies ?? []).forEach((policy) => {
      const components = parseBenefitComponents(policy.benefit_components);
      components.forEach((comp) => {
        if (!comp.calculationId) return;
        if (!map.has(comp.calculationId)) {
          map.set(comp.calculationId, { policies: [] });
        }
        map.get(comp.calculationId)!.policies.push({
          id: policy.id,
          policyName: policy.name,
          componentName: comp.name,
        });
      });
    });

    return map;
  }, [policies]);
}

function parseBenefitComponents(raw: any): { name: string; calculationId?: string }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw.components) return raw.components;
  return [];
}
