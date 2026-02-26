import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type TaxTreatment = "equalized" | "protected" | "employee_borne" | "laissez_faire";
export type GrossUpMode = "standard" | "selective" | "none";

export interface TaxConfig {
  taxTreatment: TaxTreatment;
  grossUpMode: GrossUpMode;
  includeSocialSecurity: boolean;
  includeHousingInGrossUp: boolean;
  includeEducationInGrossUp: boolean;
  includeColaInGrossUp: boolean;
  hypoTaxMethod: string;
  equalizationSettlement: string;
}

interface TaxConfigContextValue extends TaxConfig {
  setTaxTreatment: (v: TaxTreatment) => void;
  setGrossUpMode: (v: GrossUpMode) => void;
  setIncludeSocialSecurity: (v: boolean) => void;
  setIncludeHousingInGrossUp: (v: boolean) => void;
  setIncludeEducationInGrossUp: (v: boolean) => void;
  setIncludeColaInGrossUp: (v: boolean) => void;
  setHypoTaxMethod: (v: string) => void;
  setEqualizationSettlement: (v: string) => void;
  /** Maps TaxTreatment enum to the simulation tax_approach string */
  simulationTaxApproach: string;
  /** Computes the gross-up multiplier based on current config */
  grossUpMultiplier: number;
}

const TaxConfigContext = createContext<TaxConfigContextValue | undefined>(undefined);

const TAX_APPROACH_MAP: Record<TaxTreatment, string> = {
  equalized: "tax-equalization",
  protected: "tax-protection",
  employee_borne: "actual-tax",
  laissez_faire: "actual-tax",
};

// Base tax cost rates by approach
const TAX_RATE_MAP: Record<string, number> = {
  "tax-equalization": 0.35,
  "tax-protection": 0.28,
  "actual-tax": 0.22,
};

export function TaxConfigProvider({ children }: { children: ReactNode }) {
  const [taxTreatment, setTaxTreatment] = useState<TaxTreatment>("equalized");
  const [grossUpMode, setGrossUpMode] = useState<GrossUpMode>("standard");
  const [includeSocialSecurity, setIncludeSocialSecurity] = useState(true);
  const [includeHousingInGrossUp, setIncludeHousingInGrossUp] = useState(true);
  const [includeEducationInGrossUp, setIncludeEducationInGrossUp] = useState(false);
  const [includeColaInGrossUp, setIncludeColaInGrossUp] = useState(true);
  const [hypoTaxMethod, setHypoTaxMethod] = useState("marginal");
  const [equalizationSettlement, setEqualizationSettlement] = useState("annual");

  const simulationTaxApproach = TAX_APPROACH_MAP[taxTreatment];

  // Gross-up multiplier: adds incremental % for each included benefit
  const grossUpMultiplier = (() => {
    if (grossUpMode === "none") return 0;
    let mult = 1.0; // base tax gross-up
    const active = grossUpMode === "standard"; // standard = all on
    if (active || includeSocialSecurity) mult += 0.08;
    if (active || includeHousingInGrossUp) mult += 0.05;
    if (active || includeEducationInGrossUp) mult += 0.03;
    if (active || includeColaInGrossUp) mult += 0.04;
    return mult;
  })();

  return (
    <TaxConfigContext.Provider
      value={{
        taxTreatment, setTaxTreatment,
        grossUpMode, setGrossUpMode,
        includeSocialSecurity, setIncludeSocialSecurity,
        includeHousingInGrossUp, setIncludeHousingInGrossUp,
        includeEducationInGrossUp, setIncludeEducationInGrossUp,
        includeColaInGrossUp, setIncludeColaInGrossUp,
        hypoTaxMethod, setHypoTaxMethod,
        equalizationSettlement, setEqualizationSettlement,
        simulationTaxApproach,
        grossUpMultiplier,
      }}
    >
      {children}
    </TaxConfigContext.Provider>
  );
}

export function useTaxConfig() {
  const ctx = useContext(TaxConfigContext);
  if (!ctx) throw new Error("useTaxConfig must be used within TaxConfigProvider");
  return ctx;
}

export { TAX_RATE_MAP };
