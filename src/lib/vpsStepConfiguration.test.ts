/**
 * Tests for VPS Step Configuration System
 */

import { describe, it, expect } from "vitest";
import {
  getActiveSteps,
  getNextStep,
  getPreviousStep,
  getCurrentStepDisplay,
  isStepActive,
  type StepConfigurationOptions,
} from "./vpsStepConfiguration";

describe("vpsStepConfiguration", () => {
  describe("getActiveSteps", () => {
    it("should return all 4 steps for Linode provider", () => {
      const options: StepConfigurationOptions = {
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      };

      const steps = getActiveSteps(options);

      expect(steps).toHaveLength(4);
      expect(steps.map((s) => s.originalStepNumber)).toEqual([1, 2, 3, 4]);
      expect(steps.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4]);
      expect(steps.every((s) => s.isActive)).toBe(true);
    });

    it("should return all 4 steps for DigitalOcean without marketplace app", () => {
      const options: StepConfigurationOptions = {
        providerType: "digitalocean",
        hasMarketplaceApp: false,
        formData: {},
      };

      const steps = getActiveSteps(options);

      expect(steps).toHaveLength(4);
      expect(steps.map((s) => s.originalStepNumber)).toEqual([1, 2, 3, 4]);
      expect(steps.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4]);
    });

    it("should skip step 3 (OS selection) for DigitalOcean with marketplace app", () => {
      const options: StepConfigurationOptions = {
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: { appSlug: "wordpress" },
      };

      const steps = getActiveSteps(options);

      expect(steps).toHaveLength(3);
      expect(steps.map((s) => s.originalStepNumber)).toEqual([1, 2, 4]);
      // Display numbers should be renumbered sequentially
      expect(steps.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
      expect(steps.every((s) => s.isActive)).toBe(true);
    });

    it("should set correct totalSteps for each configuration", () => {
      const linodeSteps = getActiveSteps({
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      });

      const doWithAppSteps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      expect(linodeSteps.every((s) => s.totalSteps === 4)).toBe(true);
      expect(doWithAppSteps.every((s) => s.totalSteps === 3)).toBe(true);
    });

    it("should customize step titles based on provider", () => {
      const linodeSteps = getActiveSteps({
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      });

      const doSteps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: false,
        formData: {},
      });

      const linodeStep2 = linodeSteps.find((s) => s.originalStepNumber === 2);
      const doStep2 = doSteps.find((s) => s.originalStepNumber === 2);

      expect(linodeStep2?.title).toBe("1-Click Deployments");
      expect(doStep2?.title).toBe("Marketplace Apps");
    });

    it("should customize step descriptions based on marketplace app selection", () => {
      const withoutApp = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: false,
        formData: {},
      });

      const withApp = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      const step4WithoutApp = withoutApp.find((s) => s.originalStepNumber === 4);
      const step4WithApp = withApp.find((s) => s.originalStepNumber === 4);

      expect(step4WithoutApp?.description).toContain("Set credentials");
      expect(step4WithApp?.description).toContain("marketplace app OS");
    });
  });

  describe("getNextStep", () => {
    it("should return next step in sequence for normal workflow", () => {
      const steps = getActiveSteps({
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      });

      expect(getNextStep(1, steps)).toBe(2);
      expect(getNextStep(2, steps)).toBe(3);
      expect(getNextStep(3, steps)).toBe(4);
      expect(getNextStep(4, steps)).toBeNull();
    });

    it("should skip inactive steps in DigitalOcean with marketplace app", () => {
      const steps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      expect(getNextStep(1, steps)).toBe(2);
      expect(getNextStep(2, steps)).toBe(4); // Skip step 3
      expect(getNextStep(4, steps)).toBeNull();
    });
  });

  describe("getPreviousStep", () => {
    it("should return previous step in sequence for normal workflow", () => {
      const steps = getActiveSteps({
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      });

      expect(getPreviousStep(1, steps)).toBeNull();
      expect(getPreviousStep(2, steps)).toBe(1);
      expect(getPreviousStep(3, steps)).toBe(2);
      expect(getPreviousStep(4, steps)).toBe(3);
    });

    it("should skip inactive steps in DigitalOcean with marketplace app", () => {
      const steps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      expect(getPreviousStep(1, steps)).toBeNull();
      expect(getPreviousStep(2, steps)).toBe(1);
      expect(getPreviousStep(4, steps)).toBe(2); // Skip step 3
    });
  });

  describe("getCurrentStepDisplay", () => {
    it("should return correct display numbers for normal workflow", () => {
      const steps = getActiveSteps({
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      });

      expect(getCurrentStepDisplay(1, steps)).toEqual({
        stepNumber: 1,
        totalSteps: 4,
      });
      expect(getCurrentStepDisplay(4, steps)).toEqual({
        stepNumber: 4,
        totalSteps: 4,
      });
    });

    it("should return renumbered display for DigitalOcean with marketplace app", () => {
      const steps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      expect(getCurrentStepDisplay(1, steps)).toEqual({
        stepNumber: 1,
        totalSteps: 3,
      });
      expect(getCurrentStepDisplay(2, steps)).toEqual({
        stepNumber: 2,
        totalSteps: 3,
      });
      // Step 3 is skipped, so step 4 becomes display step 3
      expect(getCurrentStepDisplay(4, steps)).toEqual({
        stepNumber: 3,
        totalSteps: 3,
      });
    });

    it("should return null for inactive steps", () => {
      const steps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      // Step 3 is skipped
      expect(getCurrentStepDisplay(3, steps)).toBeNull();
    });
  });

  describe("isStepActive", () => {
    it("should return true for all steps in normal workflow", () => {
      const steps = getActiveSteps({
        providerType: "linode",
        hasMarketplaceApp: false,
        formData: {},
      });

      expect(isStepActive(1, steps)).toBe(true);
      expect(isStepActive(2, steps)).toBe(true);
      expect(isStepActive(3, steps)).toBe(true);
      expect(isStepActive(4, steps)).toBe(true);
    });

    it("should return false for skipped step in DigitalOcean with marketplace app", () => {
      const steps = getActiveSteps({
        providerType: "digitalocean",
        hasMarketplaceApp: true,
        formData: {},
      });

      expect(isStepActive(1, steps)).toBe(true);
      expect(isStepActive(2, steps)).toBe(true);
      expect(isStepActive(3, steps)).toBe(false); // Skipped
      expect(isStepActive(4, steps)).toBe(true);
    });
  });
});
