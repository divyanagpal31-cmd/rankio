import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/landing-page";
import { ReportPage } from "./components/report-page";
import { DashboardLayout } from "./components/dashboard/dashboard-layout";
import { Overview } from "./components/dashboard/overview";
import { MyWebsites } from "./components/dashboard/my-websites";
import { Reports } from "./components/dashboard/reports";
import { Subscription } from "./components/dashboard/subscription";
import { ProfileSettings } from "./components/dashboard/profile-settings";
import { ProtectedRoute } from "./components/protected-route";
import { TermsOfUse } from "./components/terms-of-use";
import { PrivacyPolicy } from "./components/privacy-policy";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/terms",
    element: <TermsOfUse />,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/report",
    element: <ReportPage />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Overview />,
      },
      {
        path: "websites",
        element: <MyWebsites />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "subscription",
        element: <Subscription />,
      },
      {
        path: "settings",
        element: <ProfileSettings />,
      },
    ],
  },
]);
