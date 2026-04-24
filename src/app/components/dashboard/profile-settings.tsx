import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../../lib/supabase";

type ProfileFormData = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
};

type ProfileErrors = Record<keyof ProfileFormData, string>;

type PersistedProfile = Pick<ProfileFormData, "fullName" | "email" | "phone" | "company">;

const emptyErrors = (): ProfileErrors => ({
  fullName: "",
  email: "",
  phone: "",
  company: "",
});

const emptyFormData = (): ProfileFormData => ({
  fullName: "",
  email: "",
  phone: "",
  company: "",
});

const emptyPersistedProfile = (): PersistedProfile => ({
  fullName: "",
  email: "",
  phone: "",
  company: "",
});

function normalizeValue(value: string) {
  return value.trim();
}

function getProfileErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";

  if (code === "PGRST205" || code === "42P01") {
    return "";
  }

  if (message.includes("profiles") && message.includes("schema cache")) {
    return "";
  }

  if (message.includes("relation") && message.includes("profiles")) {
    return "";
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("violates row level security")
  ) {
    return "Profiles table is blocked by RLS. Add a policy that allows authenticated users to select/insert/update their own row.";
  }

  return "message" in error && typeof error.message === "string" ? error.message : "";
}

export function ProfileSettings() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>(emptyFormData);
  const [errors, setErrors] = useState<ProfileErrors>(emptyErrors);
  const [initialProfile, setInitialProfile] = useState<PersistedProfile>(emptyPersistedProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (!isMounted) return;
        setFormData(emptyFormData());
        setInitialProfile(emptyPersistedProfile());
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);

      const metadata = user.user_metadata ?? {};
      const authProfile: PersistedProfile = {
        fullName: typeof metadata.full_name === "string" ? metadata.full_name : "",
        email: user.email ?? "",
        phone:
          typeof metadata.phone === "string"
            ? metadata.phone
            : typeof user.phone === "string"
              ? user.phone
              : "",
        company: typeof metadata.company === "string" ? metadata.company : "",
      };

      let mergedProfile = authProfile;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, company")
        .eq("id", user.id)
        .maybeSingle();

      const profileErrorMessage = getProfileErrorMessage(error);
      if (profileErrorMessage && isMounted) {
        setStatus({ type: "error", message: profileErrorMessage });
      }

      if (data && isMounted) {
        mergedProfile = {
          fullName:
            typeof data.full_name === "string" && data.full_name.trim()
              ? data.full_name
              : authProfile.fullName,
          email:
            typeof data.email === "string" && data.email.trim() ? data.email : authProfile.email,
          phone:
            typeof data.phone === "string" && data.phone.trim() ? data.phone : authProfile.phone,
          company:
            typeof data.company === "string" && data.company.trim()
              ? data.company
              : authProfile.company,
        };
      }

      if (!isMounted) return;

      setInitialProfile(mergedProfile);
      setFormData((prev) => ({
        ...prev,
        ...mergedProfile,
      }));
      setErrors(emptyErrors());
      setLoadingProfile(false);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const validateFullName = (value: string) => {
    const normalized = normalizeValue(value);
    if (!normalized) return "Full name is required";
    if (normalized.length < 2) return "Full name must be at least 2 characters";
    return "";
  };

  const validateEmail = (value: string) => {
    const normalized = normalizeValue(value);
    if (!normalized) return "Email is required";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalized)) return "Please enter a valid email address";
    return "";
  };

  const validatePhone = (value: string) => {
    const normalized = normalizeValue(value);
    if (!normalized) return "";
    const phonePattern = /^\+?[0-9()\-\s]{7,20}$/;
    if (!phonePattern.test(normalized)) return "Please enter a valid phone number";
    return "";
  };

  const validateField = (field: keyof ProfileFormData, draft: ProfileFormData) => {
    switch (field) {
      case "fullName":
        return validateFullName(draft.fullName);
      case "email":
        return validateEmail(draft.email);
      case "phone":
        return validatePhone(draft.phone);
      default:
        return "";
    }
  };

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleBlur = (field: keyof ProfileFormData) => {
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setStatus({ type: "error", message: "You need to be logged in to update your profile." });
      return;
    }

    // Email is the OTP login identifier; keep it read-only and derived from the session user.
    const sessionEmail = (user.email ?? "").trim().toLowerCase();

    const sanitizedProfile: PersistedProfile = {
      fullName: normalizeValue(formData.fullName),
      email: sessionEmail || normalizeValue(formData.email).toLowerCase(),
      phone: normalizeValue(formData.phone),
      company: normalizeValue(formData.company),
    };

    const nextErrors: ProfileErrors = {
      fullName: validateFullName(sanitizedProfile.fullName),
      email: validateEmail(sanitizedProfile.email),
      phone: validatePhone(sanitizedProfile.phone),
      company: "",
    };

    setErrors(nextErrors);

    const hasErrors = Object.values(nextErrors).some(Boolean);
    if (hasErrors) {
      return;
    }

    const hasProfileChanges =
      sanitizedProfile.fullName !== normalizeValue(initialProfile.fullName) ||
      sanitizedProfile.phone !== normalizeValue(initialProfile.phone) ||
      sanitizedProfile.company !== normalizeValue(initialProfile.company);

    if (!hasProfileChanges) {
      setStatus({ type: "success", message: "No changes to save." });
      return;
    }

    setSaving(true);
    setStatus(null);

    const updatedMetadata = {
      ...(user.user_metadata ?? {}),
      full_name: sanitizedProfile.fullName,
      company: sanitizedProfile.company || null,
      phone: sanitizedProfile.phone || null,
    };

    try {
      if (hasProfileChanges) {
        const updatePayload: {
          data: typeof updatedMetadata;
        } = {
          data: updatedMetadata,
        };

        const { error: authError } = await supabase.auth.updateUser(updatePayload, {
          emailRedirectTo: window.location.origin,
        });

        if (authError) {
          throw new Error(authError.message);
        }

        const { error: profileUpsertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: sanitizedProfile.email,
            full_name: sanitizedProfile.fullName,
            phone: sanitizedProfile.phone || null,
            company: sanitizedProfile.company || null,
          },
          { onConflict: "id" }
        );

        const profileErrorMessage = getProfileErrorMessage(profileUpsertError);
        if (profileErrorMessage) {
          throw new Error(profileErrorMessage);
        }
      }

      setInitialProfile(sanitizedProfile);
      setFormData((prev) => ({
        ...prev,
        ...sanitizedProfile,
      }));
      setStatus({
        type: "success",
        message:
          "Your profile has been updated.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save your changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Update your personal information and security settings
          </p>
        </div>

        <Card className="border-border/40">
          <CardContent className="py-10">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading your profile...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
          Profile Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Update your personal information and security settings
        </p>
      </div>

      {status && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p>{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onBlur={() => handleBlur("fullName")}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className={`h-11 ${errors.fullName ? "border-red-400 focus:border-red-400" : ""}`}
              />
              {errors.fullName && <p className="text-red-600 text-sm">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onBlur={() => handleBlur("email")}
                  disabled
                  className={`h-11 pl-10 bg-gray-50 ${errors.email ? "border-red-400 focus:border-red-400" : ""}`}
                />
              </div>
              {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
              <p className="text-xs text-muted-foreground">
                This is your OTP login email and cannot be changed here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onBlur={() => handleBlur("phone")}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 555 123 4567"
                  className={`h-11 pl-10 ${errors.phone ? "border-red-400 focus:border-red-400" : ""}`}
                />
              </div>
              {errors.phone && <p className="text-red-600 text-sm">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm text-gray-700" style={{ fontWeight: 500 }}>
                Company Name
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent/90 text-white gap-2 px-8 disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
