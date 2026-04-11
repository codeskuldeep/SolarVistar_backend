import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ApiResponse from "../utils/ApiResponse.js";

// @desc    Get Admin Dashboard Stats (Counts & Recent Data)
// @route   GET /api/dashboard/admin-stats
// @access  Private/Admin
export const getAdminStats = catchAsyncError(async (req, res, next) => {
  const [
    totalUsers,
    activeLeadsCount,
    pendingVisitsCount,
    totalLeads,
    convertedCount,
    recentVisits,
  ] = await prisma.$transaction([
    // 1. Total Team Members
    prisma.user.count(),

    // 2. Active Leads (NEW, CONTACTED, INTERESTED)
    prisma.lead.count({
      where: {
        status: { in: ["NEW", "CONTACTED", "INTERESTED"] },
      },
    }),

    // 3. Pending Visits
    prisma.visit.count({
      where: { status: "PENDING" },
    }),

    // 4. Total Leads (for conversion rate)
    prisma.lead.count(),

    // 5. Converted Leads
    prisma.lead.count({
      where: { status: "CONVERTED" },
    }),

    // 6. Recent 5 Visits (upcoming first)
    prisma.visit.findMany({
      take: 5,
      orderBy: { visitDatetime: "desc" },
    }),
  ]);

  const conversionRate =
    totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers,
        activeLeadsCount,
        pendingVisitsCount,
        conversionRate,
        recentVisits,
      },
      "Admin stats fetched successfully"
    )
  );
});
