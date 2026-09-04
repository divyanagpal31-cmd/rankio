import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/landing-page";
import { ReportPage } from "./components/report-page";
import { DashboardLayout } from "./components/dashboard/dashboard-layout";
import { Overview } from "./components/dashboard/overview";
import { MyWebsites } from "./components/dashboard/my-websites";
import { ReportComparisonPage } from "./components/dashboard/report-comparison-page";
import { Subscription } from "./components/dashboard/subscription";
import { ProfileSettings } from "./components/dashboard/profile-settings";
import { Integrations } from "./components/dashboard/integrations";
import { ProtectedRoute } from "./components/protected-route";
import { TermsOfUse } from "./components/terms-of-use";
import { PrivacyPolicy } from "./components/privacy-policy";
import { RefundPolicy } from "./components/refund-policy";
import { ContactUs } from "./components/contact-us";
import { PayPalSuccess } from "./components/paypal-success";
import { PayPalCancel } from "./components/paypal-cancel";
import { ScrollManager } from "./components/scroll-manager";

export const router = createBrowserRouter([
  {
    element: <ScrollManager />,
    children: [
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
        path: "/refund-policy",
        element: <RefundPolicy />,
      },
      {
        path: "/contact",
        element: <ContactUs />,
      },
      {
        path: "/report",
        element: <ReportPage />,
      },
      {
        path: "/paypal/success",
        element: <PayPalSuccess />,
      },
      {
        path: "/paypal/cancel",
        element: <PayPalCancel />,
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
            path: "reports",
            element: <MyWebsites />,
          },
          {
            path: "reports/compare",
            element: <ReportComparisonPage />,
          },
          {
            path: "subscription",
            element: <Subscription />,
          },
          {
            path: "settings",
            element: <ProfileSettings />,
          },
          {
            path: "integrations",
            element: <Integrations />,
          },
        ],
      },
    ],
  },
]);
