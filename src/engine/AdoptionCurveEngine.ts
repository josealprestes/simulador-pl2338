import type { Company } from "./Company";
import type { AdoptionCurveSnapshot, MarketCreationSnapshot } from "./types";

export class AdoptionCurveEngine {
  /**
   * Damping factor for exponential moving average (EMA) smoothing of adoption curves.
   * 0.0 = fully damped (no change), 1.0 = no damping (raw values).
   * Values below 1.0 smooth out single-product jumps when total products are small,
   * preserving long-term trends while reducing short-term noise.
   */
  static readonly ADOPTION_DAMPING = 0.3;

  /**
   * Minimum product count before damping is fully applied.
   * When totalProducts < this threshold, damping is increased proportionally.
   */
  static readonly DAMPING_MIN_PRODUCTS = 10;

  static computeAdoptionSnapshot(
    companies: Company[],
    previousSnapshot?: AdoptionCurveSnapshot,
  ): AdoptionCurveSnapshot {
    const active = companies.filter((c) => !c.bankrupt);
    const totalProducts = active.reduce((a, c) => a + c.products.length, 0);
    const compCount = active.reduce(
      (a, c) => a + c.products.filter((p) => p.aiType === "COMPLEMENTARY").length,
      0,
    );
    const substCount = active.reduce(
      (a, c) => a + c.products.filter((p) => p.aiType === "SUBSTITUTIVE").length,
      0,
    );
    const genCount = active.reduce(
      (a, c) => a + c.products.filter((p) => p.aiType === "GENERATIVE").length,
      0,
    );

    let adoptionComplementary = totalProducts > 0 ? compCount / totalProducts : 0;
    let adoptionSubstitutive = totalProducts > 0 ? substCount / totalProducts : 0;
    let adoptionGenerative = totalProducts > 0 ? genCount / totalProducts : 0;

    // ── Mercado sem produtos ────────────────────────────────────────
    // Quando não existem produtos, o snapshot é zerado ANTES da EMA:
    // caso contrário, a EMA conservaria proporções antigas de um mercado
    // que esvaziou (mercado vazio deve ser representado como adoção zero,
    // não como resquício do snapshot anterior).
    if (totalProducts === 0) {
      return {
        adoptionComplementary: 0,
        adoptionSubstitutive: 0,
        adoptionGenerative: 0,
        substitutionRate: 0,
        adoptionVelocity: 0,
        compCount: 0,
        substCount: 0,
        genCount: 0,
        totalProducts: 0,
      };
    }

    // ── Exponential Moving Average damping ──────────────────────────
    // When previous snapshot exists, smooth the curve to prevent
    // abrupt jumps caused by small-number statistics (a single product
    // changing category can swing ratios wildly when totalProducts < 10).
    // The damping factor increases (smoother) when totalProducts is low.
    if (previousSnapshot) {
      const productRatio = Math.min(1, totalProducts / AdoptionCurveEngine.DAMPING_MIN_PRODUCTS);
      // Effective alpha: more damping when few products, less when many
      const alpha = 0.1 + (AdoptionCurveEngine.ADOPTION_DAMPING - 0.1) * productRatio;

      adoptionComplementary =
        alpha * adoptionComplementary +
        (1 - alpha) * previousSnapshot.adoptionComplementary;

      adoptionSubstitutive =
        alpha * adoptionSubstitutive +
        (1 - alpha) * previousSnapshot.adoptionSubstitutive;

      adoptionGenerative =
        alpha * adoptionGenerative +
        (1 - alpha) * previousSnapshot.adoptionGenerative;

      // Normalizar para garantir que a soma seja sempre 1
      const sum = adoptionComplementary + adoptionSubstitutive + adoptionGenerative;
      if (sum > 0) {
        adoptionComplementary /= sum;
        adoptionSubstitutive /= sum;
        adoptionGenerative /= sum;
      }
    }

    const highRiskProducts = active.flatMap((c) =>
      c.products.filter((p) => p.riskLevel === "HIGH"),
    );
    const substHighCount = highRiskProducts.filter(
      (p) => p.aiType === "SUBSTITUTIVE",
    ).length;
    const substitutionRate =
      highRiskProducts.length > 0 ? substHighCount / highRiskProducts.length : 0;

    let adoptionVelocity = 0;
    if (previousSnapshot) {
      const deltaComp = adoptionComplementary - previousSnapshot.adoptionComplementary;
      const deltaSubst = adoptionSubstitutive - previousSnapshot.adoptionSubstitutive;
      const deltaGen = adoptionGenerative - previousSnapshot.adoptionGenerative;
      adoptionVelocity = Math.max(Math.abs(deltaComp), Math.abs(deltaSubst), Math.abs(deltaGen));
    }

    return {
      adoptionComplementary: parseFloat(adoptionComplementary.toFixed(4)),
      adoptionSubstitutive: parseFloat(adoptionSubstitutive.toFixed(4)),
      adoptionGenerative: parseFloat(adoptionGenerative.toFixed(4)),
      substitutionRate: parseFloat(substitutionRate.toFixed(4)),
      adoptionVelocity: parseFloat(adoptionVelocity.toFixed(4)),
      compCount,
      substCount,
      genCount,
      totalProducts,
    };
  }

  static computeMarketCreationSnapshot(
    companies: Company[],
    turn: number,
  ): MarketCreationSnapshot {
    const active = companies.filter((c) => !c.bankrupt);
    const totalCompanies = active.length;

    const innovatingCompanies = active.filter(
      (c) =>
        c.products.length > 0 &&
        c.products.some((p) => p.aiType !== "COMPLEMENTARY"),
    ).length;

    const highRiskCompanies = active.filter((c) =>
      c.products.some((p) => p.riskLevel === "HIGH"),
    ).length;

    const avgProductsPerCompany =
      totalCompanies > 0
        ? parseFloat(
            (active.reduce((a, c) => a + c.products.length, 0) / totalCompanies).toFixed(
              2,
            ),
          )
        : 0;

    const totalProducts = active.reduce((a, c) => a + c.products.length, 0);
    const marketShareSum = totalProducts > 0
      ? active.reduce((sum, c) => sum + (c.products.length / totalProducts) ** 2, 0)
      : 0;

    return {
      turn,
      totalCompanies,
      innovatingCompanies,
      highRiskCompanies,
      avgProductsPerCompany,
      diversityIndex:
        totalCompanies > 1 && totalProducts > 0
          ? parseFloat((1 - marketShareSum).toFixed(4))
          : 0,
    };
  }
}
