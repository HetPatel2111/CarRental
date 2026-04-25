import express from "express";
import {
    applyIncentive,
    createCoupon,
    deleteCoupon,
    getAdminDashboard,
    getCoupons,
    getPricingConfig,
    getSettlementQueue,
    updateCoupon,
    updatePricingConfig,
    updateSettlement
} from "../controllers/adminController.js";
import { protect } from "../middleware/auth.js";

const adminRouter = express.Router();

adminRouter.get("/dashboard", protect, getAdminDashboard);
adminRouter.get("/pricing-config", protect, getPricingConfig);
adminRouter.put("/pricing-config", protect, updatePricingConfig);
adminRouter.get("/coupons", protect, getCoupons);
adminRouter.post("/coupons", protect, createCoupon);
adminRouter.put("/coupons/:id", protect, updateCoupon);
adminRouter.delete("/coupons/:id", protect, deleteCoupon);
adminRouter.get("/settlements", protect, getSettlementQueue);
adminRouter.patch("/settlements/:id", protect, updateSettlement);
adminRouter.patch("/incentives/:id", protect, applyIncentive);

export default adminRouter;
