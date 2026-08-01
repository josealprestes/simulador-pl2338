/**
 * Utility for formatting numbers and KPIs
 */

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat("pt-BR", options).format(value);
};

export const formatKPI = (value: number | string, type: "number" | "percentage" | "currency" | "hhi") => {
  const num = typeof value === "string" ? parseFloat(value.replace("%", "")) : value;
  
  if (isNaN(num)) return value.toString();

  switch (type) {
    case "percentage":
      return formatNumber(num, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1 }) + "%";
    case "currency":
      if (num >= 1_000_000_000) { // Billions
        return `R$ ${formatNumber(num / 1_000_000_000, { minimumFractionDigits: 0, maximumFractionDigits: 1 }).replace(",", ".")}B`;
      }
      if (num >= 1_000_000) { // Millions
        return `R$ ${formatNumber(num / 1_000_000, { minimumFractionDigits: 0, maximumFractionDigits: 1 }).replace(",", ".")}M`;
      }
      if (num >= 1_000) { // Thousands
        return `R$ ${formatNumber(num / 1_000, { minimumFractionDigits: 0, maximumFractionDigits: 1 }).replace(",", ".")}K`;
      }
      return formatNumber(num, { style: "currency", currency: "BRL" });
    case "hhi":
      return formatNumber(num, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    case "number":
    default:
      return formatNumber(num, { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }
};

export const formatCurrencyShort = (value: number) => {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return `R$ ${value}`;
};
