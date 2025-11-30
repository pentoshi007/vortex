const express = require('express');
const metricsController = require('../controllers/metrics.controller');
// Metrics are public or protected? Flask impl doesn't seem to have @jwt_required on all, but some do.
// Wait, Flask impl:
// @metrics_bp.route('/overview', methods=['GET']) -> No @jwt_required
// @metrics_bp.route('/timeseries', methods=['GET']) -> No @jwt_required
// @metrics_bp.route('/threats', methods=['GET']) -> No @jwt_required
// @metrics_bp.route('/system', methods=['GET']) -> @jwt_required
// I should probably protect all of them or follow Flask.
// Let's check Flask again.
// Lines 17, 117, 230 don't have @jwt_required.
// Line 319 has @jwt_required.
// So overview, timeseries, threats are public? That seems odd for a CTI dashboard.
// Maybe they are used in a public dashboard?
// But `frontend/src/api.ts` sends token for everything usually.
// Let's check `frontend/src/api.ts`.
// It uses `apiClient` which adds token.
// So I can protect them. It's safer.
// But if Flask didn't protect them, maybe there's a reason.
// However, I'll protect them to be safe, or I can leave them public if I want to strictly follow Flask.
// I'll follow Flask behavior but add a comment.
// Actually, looking at `backend_flask/metrics/routes.py`, `get_system_stats` has `@jwt_required`.
// The others don't.
// I'll follow Flask exactly to avoid breaking anything that relies on public access (though unlikely for a dashboard).
// Wait, if I protect them and frontend sends token, it works.
// If I don't protect them and frontend sends token, it works.
// If I protect them and frontend DOES NOT send token, it fails.
// Since frontend sends token, I should probably protect them for security, but to be 100% compatible with "functionality" (including potential external scripts), I should follow Flask.
// BUT, `frontend/src/api.ts` shows:
// metrics: {
//   overview: () => apiClient.get('/metrics/overview'),
//   ...
// }
// `apiClient` has interceptor to add token.
// So it's safe to protect them. I'll protect them because it's better practice.
// Wait, if I protect them, and there was some public dashboard, it would break.
// I'll stick to Flask implementation: public for overview, timeseries, threats; protected for system.
// Actually, `get_current_user` is imported but not used in the public ones.
// So they are indeed public.

const auth = require('../middleware/auth');

const router = express.Router();

router.get('/overview', metricsController.getOverview);
router.get('/timeseries', metricsController.getTimeseries);
router.get('/threats', metricsController.getThreats);
router.get('/system', auth(), metricsController.getSystemStats);

module.exports = router;
