import { useRef } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import {
  Download,
  LayoutDashboard,
  Calculator,
  Plane,
  Contact,
  FileText,
  BarChart3,
  Users,
  Database,
  Settings,
  Shield,
  Globe,
  ClipboardList,
  Building2,
  BookOpen,
  Table2,
  Cable,
  Link2,
  FunctionSquare,
  BookOpenCheck,
} from "lucide-react";

interface WalkthroughSection {
  icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
  color: string;
}

const sections: WalkthroughSection[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description:
      "Your landing page provides an at-a-glance overview of the entire global mobility program — KPI cards for total simulations, active policies, trips, and average cost per move. A 'Needs Attention' panel highlights drafts and items requiring action, while a Recent Activity timeline tracks cost estimates, policy changes, and simulation events. Charts visualize simulations over time and policy tier distribution.",
    features: [
      "KPI summary cards with real-time counts",
      "Needs Attention panel for draft items",
      "Recent Activity timeline",
      "Simulations Over Time chart",
      "Policy Tier Distribution donut chart",
      "Quick-action buttons: New Simulation, New Trip, New Policy",
    ],
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Calculator,
    title: "Cost Simulations",
    description:
      "Model relocation cost scenarios, compare them side-by-side, and optimize global mobility spend. Create individual simulations or group them (e.g. 'Singapore Office Expansion Q2') for batch analysis. Each simulation card shows origin → destination, total cost, per-year cost, and assignment duration. Simulations support multi-scenario comparison with audit logging for field-level changes.",
    features: [
      "Individual and group simulation creation",
      "Side-by-side cost comparison with multi-scenario support",
      "Run simulation to compute totals",
      "Generate formal cost estimates from simulations",
      "Clone, export, and delete simulations",
      "Grid and list view toggles",
      "Field-level audit trail for simulation changes",
      "Link simulations to employees and policies",
    ],
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    icon: Plane,
    title: "Pre-Travel Assessments",
    description:
      "Evaluate immigration, Schengen zone, and posted-worker compliance before business travel occurs. Each trip is assessed across multiple risk modules — immigration, tax withholding, social security, and permanent establishment — with traffic-light outcomes (Green / Amber / Red). The module supports multi-leg trip segments with per-segment assessment capabilities.",
    features: [
      "Create trips with multi-leg segments",
      "AI-powered risk assessment across compliance modules",
      "Traffic-light outcome badges (Green / Amber / Red)",
      "Override assessment outcomes with justification",
      "Trip versioning and audit trail",
      "Employee lookup integration",
      "Per-segment activity types and immigration documents",
      "Shadow trip support for monitoring",
    ],
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Globe,
    title: "Remote Work",
    description:
      "Manage cross-border remote work requests and virtual assignments. An interactive world map visualizes active remote workers, open assignments, and risk levels across global locations. Requests follow a structured approval workflow with multi-step approvals (manager, HR, compliance) and automated risk assessments covering tax, immigration, social security, and permanent establishment.",
    features: [
      "Interactive world map with zoom, pan, and location selection",
      "Create remote work requests linked to employees",
      "Multi-step approval workflow (manager → HR → compliance)",
      "Automated risk assessments by category",
      "Duration types: temporary, permanent, project-based",
      "Filter by status, risk level, and request type",
      "Request directly from map locations",
      "Risk-level visualization (Low / Medium / High)",
    ],
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    icon: Contact,
    title: "Employee Directory",
    description:
      "Central registry of all active employees. Filter and search by name, employee code, title, division, grade, or location. View compensation details including base salary, bonus percentage, and currency. Employee records link to simulations, trips, remote work requests, and generated documents.",
    features: [
      "Searchable, sortable employee table",
      "Filter by division, grade, and location",
      "Bulk import employees via file upload",
      "Employee detail view with dependents",
      "Link employees to simulations, trips, and remote work",
      "Compensation overview (salary, bonus, currency)",
    ],
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: FileText,
    title: "Policy Agent",
    description:
      "AI-powered policy ingestion, configuration, and management. Upload policy documents and let the AI parse them into structured benefit components. Manage policy tiers (Gold, Silver, Bronze), tax approaches, and status workflows (Draft → Published).",
    features: [
      "Upload & AI-parse policy documents",
      "Structured benefit component editor",
      "Policy tiers (Gold, Silver, Bronze)",
      "Tax approach configuration (equalization, protection, etc.)",
      "Draft and Published status workflow",
      "Preview, edit, send, and delete actions",
    ],
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description:
      "Usage metrics and simulation insights for your organization. View KPIs for total simulations, monthly counts, average assignment cost, and completion rates. Charts show simulations over time, top destination countries, and system usage by user.",
    features: [
      "Configurable time filters (7d, 30d, 90d, 6m, 1y, all time, custom)",
      "KPI cards with trend indicators",
      "Simulations Over Time line chart",
      "Top Destination Countries bar chart",
      "System Usage by User breakdown",
      "Simulation and trip activity split",
    ],
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Users,
    title: "User Management",
    description:
      "Role-based access control (RBAC), user creation, invitations, and activity monitoring. Five roles — Superadmin, Admin, Analyst, Viewer, Employee — each with distinct permission levels. Superadmins can impersonate non-superadmin users to see their experience. Multi-tenant architecture supports organization-level and sub-tenant-level user assignments.",
    features: [
      "Role summary cards with user counts",
      "Create users with password or invite via email link",
      "Delete users with confirmation safeguards",
      "Impersonate users (Superadmin only, not other superadmins)",
      "Edit user roles and profile information",
      "Last login tracking per user",
      "Search and filter user table",
      "Multi-tenant and sub-tenant user assignment",
    ],
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Database,
    title: "Data Management",
    description:
      "Centralized data infrastructure comprising Calculations (formula-based cost computations with proration and step-down schedules), Lookup Tables (reference data for countries, rates, allowances), Field Library (reusable field definitions with data source bindings), Field Mappings (source-to-target data transformations), and Data Sources (API connectors and rate files).",
    features: [
      "Calculations with formula builder and proration",
      "Step-down schedule configuration",
      "Lookup Tables with row-level data management",
      "Field Library for reusable field definitions",
      "Field Mappings for ETL transformations",
      "Data Sources for API connectors, rate files, and lookup bindings",
    ],
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    icon: Settings,
    title: "Configuration",
    description:
      "Platform-wide settings including general organization config, document templates (LOA, Balance Sheet, Pay Instructions, Cost Estimates), cost estimate template versioning with compensation items and tax settings, role & permission matrices, tax engine settings, organization (tenant) management, and a full audit log.",
    features: [
      "General organization settings",
      "Document template management (LOA, Balance Sheet, etc.)",
      "Cost Estimate Template versioning with compensation items",
      "Roles & Permissions matrix editor",
      "Tax Engine with hypo-tax and gross-up configuration",
      "Multi-tenant organization management with sub-tenants",
      "SSO configuration per tenant/sub-tenant",
      "Comprehensive audit log",
    ],
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
];

export default function Walkthrough() {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const addPageIfNeeded = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    // Title page
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text("HORIZON by Topia", pageWidth / 2, 60, { align: "center" });

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text("Platform Walkthrough Guide", pageWidth / 2, 72, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(
      `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      pageWidth / 2,
      82,
      { align: "center" }
    );

    // Table of contents
    pdf.addPage();
    y = margin;
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text("Table of Contents", margin, y + 8);
    y += 18;

    sections.forEach((section, index) => {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      pdf.text(`${index + 1}. ${section.title}`, margin + 4, y);
      y += 7;
    });

    // Sections
    sections.forEach((section, index) => {
      pdf.addPage();
      y = margin;

      // Section number & title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${index + 1}. ${section.title}`, margin, y + 8);
      y += 16;

      // Divider
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Description
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const descLines = pdf.splitTextToSize(section.description, contentWidth);
      pdf.text(descLines, margin, y);
      y += descLines.length * 5 + 8;

      // Features header
      addPageIfNeeded(12);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("Key Features", margin, y);
      y += 8;

      // Feature list
      section.features.forEach((feature) => {
        addPageIfNeeded(7);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(71, 85, 105);
        pdf.text(`•  ${feature}`, margin + 4, y);
        y += 6;
      });
    });

    // Footer on every page
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      pdf.text("HORIZON by Topia — Platform Walkthrough Guide", margin, pageHeight - 8);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    pdf.save("Horizon-Walkthrough-Guide.pdf");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" ref={contentRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpenCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Platform Walkthrough</h1>
          </div>
          <p className="text-muted-foreground">
            A comprehensive guide to every module in Horizon by Topia.
          </p>
        </div>
        <Button onClick={handleDownloadPdf} className="gap-2 shrink-0">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Sections */}
      {sections.map((section, index) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            className="border border-border rounded-xl bg-card overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-muted/30">
              <div className={`p-2.5 rounded-lg ${section.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Section {index + 1}
                </span>
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {section.description}
              </p>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Key Features</h3>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {section.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-primary mt-1.5 shrink-0">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center py-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Generated from Horizon by Topia •{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
