const { getDatabase } = require('../database/db');
const fossilService = require('../services/fossilService');
const projectService = require('../services/projectService');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const db = getDatabase();

    // 1. KPI aggregates
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM configuration_items').get().count;
    const activeBaselines = db.prepare("SELECT COUNT(*) as count FROM baselines WHERE status = 'Active' OR status = 'Approved'").get().count;
    const totalRollbacks = db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE action = 'CONFIGURATION_ROLLBACK'").get().count;
    const changesThisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM change_requests 
      WHERE created_date >= datetime('now', '-7 days')
    `).get().count;

    // Check Fossil status
    const fossilStatus = await fossilService.isAvailable();

    // Collect revisions across projects from Fossil
    const projects = projectService.getAll();
    let totalRevisions = 0;
    const allTimelineEntries = [];

    for (const p of projects) {
      try {
        const tl = await fossilService.getTimeline(p.workspace_path, 30);
        totalRevisions += tl.length;
        tl.forEach(item => {
          allTimelineEntries.push({ ...item, projectName: p.name });
        });
      } catch (e) {
        // Ignore individual project fossil read errors
      }
    }

    // Drift summary across active projects
    let driftCount = 0;
    const recentAudit = db.prepare(`
      SELECT action, count(*) as count 
      FROM audit_logs 
      GROUP BY action
    `).all();

    // 2. Charts Data
    // Chart 1: Evolution Timeline (last 10 checkins)
    const evolutionTimeline = allTimelineEntries
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // Chart 2: Revisions Over Time (grouped by date)
    const revsByDateMap = new Map();
    allTimelineEntries.forEach(entry => {
      const d = entry.date;
      revsByDateMap.set(d, (revsByDateMap.get(d) || 0) + 1);
    });
    const revisionsOverTime = Array.from(revsByDateMap.entries())
      .map(([date, count]) => ({ date, revisions: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Chart 3: Change Activity (by status)
    const changesByStatus = db.prepare(`
      SELECT status, count(*) as count 
      FROM change_requests 
      GROUP BY status
    `).all();

    // Chart 4: Baseline Distribution (by status: Approved, Active, Superseded, Archived)
    const baselineDistribution = db.prepare(`
      SELECT status, count(*) as count 
      FROM baselines 
      GROUP BY status
    `).all();

    // Chart 5: Configuration Status (by file type)
    const configByType = db.prepare(`
      SELECT file_type, count(*) as count 
      FROM configuration_items 
      GROUP BY file_type
    `).all();

    // Chart 6: Rollback Activity (over time from audit logs)
    const rollbackLogs = db.prepare(`
      SELECT strftime('%Y-%m-%d', timestamp) as date, count(*) as count
      FROM audit_logs 
      WHERE action = 'CONFIGURATION_ROLLBACK'
      GROUP BY date
      ORDER BY date ASC
    `).all();

    res.json({
      kpis: {
        totalProjects,
        totalItems,
        totalRevisions: totalRevisions || projects.length,
        activeBaselines,
        changesThisWeek,
        totalRollbacks,
        configurationDrift: driftCount,
        fossilStatus: {
          connected: fossilStatus.available,
          version: fossilStatus.version,
          status: fossilStatus.available ? 'Healthy' : 'Offline'
        }
      },
      charts: {
        evolutionTimeline,
        revisionsOverTime,
        changesByStatus,
        baselineDistribution,
        configByType,
        rollbackLogs
      }
    });
  } catch (err) {
    next(err);
  }
};
