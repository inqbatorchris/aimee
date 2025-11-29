import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Save,
  Upload,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function OrganizationSettings() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const orgId = currentUser?.organizationId;

  // State for form fields
  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [squareLogoPreview, setSquareLogoPreview] = useState("");
  const [darkLogoPreview, setDarkLogoPreview] = useState("");
  const [darkSquareLogoPreview, setDarkSquareLogoPreview] = useState("");

  // Fetch organization data
  const { data: orgData, isLoading } = useQuery<any>({
    queryKey: [`/api/organizations/${orgId}`],
    enabled: !!orgId
  });

  // Update state when data loads
  useEffect(() => {
    if (orgData?.organization) {
      const org = orgData.organization;
      setOrgName(org.name || "");
      setWebsite(org.domain || "");
      setEmail(org.contactEmail || "");
      setPhone(org.contactPhone || "");
      
      if (org.address) {
        setAddress(org.address.street || "");
        setCity(org.address.city || "");
        setState(org.address.state || "");
        setZip(org.address.zipCode || "");
        setCountry(org.address.country || "");
      }
      
      if (org.logoUrl) {
        setLogoPreview(org.logoUrl);
      }
      
      if (org.squareLogoUrl) {
        setSquareLogoPreview(org.squareLogoUrl);
      }
      
      if (org.darkLogoUrl) {
        setDarkLogoPreview(org.darkLogoUrl);
      }
      
      if (org.darkSquareLogoUrl) {
        setDarkSquareLogoPreview(org.darkSquareLogoUrl);
      }
    }
  }, [orgData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        body: {
          name: orgName,
          domain: website,
          contactEmail: email,
          contactPhone: phone,
          address: {
            street: address,
            city,
            state,
            zipCode: zip,
            country
          },
          // Logo is handled separately via upload
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({
        title: "Success",
        description: "Organization settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save organization settings",
        variant: "destructive",
      });
    }
  });

  // Logo upload mutation
  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/organizations/${orgId}/logo`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setLogoPreview(data.organization.logoUrl);
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    }
  });

  // Square logo upload mutation
  const squareLogoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('squareLogo', file);
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/organizations/${orgId}/square-logo`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload square logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSquareLogoPreview(data.organization.squareLogoUrl);
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({
        title: "Success",
        description: "Square logo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload square logo",
        variant: "destructive",
      });
    }
  });

  // Handle logo file selection
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      // Upload the file directly
      logoUploadMutation.mutate(file);
      
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle square logo file selection
  const handleSquareLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Square logo must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      // Upload the file directly
      squareLogoUploadMutation.mutate(file);
      
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setSquareLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Dark logo upload mutation
  const darkLogoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('darkLogo', file);
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/organizations/${orgId}/dark-logo`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload dark logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setDarkLogoPreview(data.organization.darkLogoUrl);
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({
        title: "Success",
        description: "Dark mode logo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload dark mode logo",
        variant: "destructive",
      });
    }
  });

  // Dark square logo upload mutation
  const darkSquareLogoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('darkSquareLogo', file);
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/organizations/${orgId}/dark-square-logo`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload dark square logo');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setDarkSquareLogoPreview(data.organization.darkSquareLogoUrl);
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${orgId}`] });
      toast({
        title: "Success",
        description: "Dark mode square logo uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload dark mode square logo",
        variant: "destructive",
      });
    }
  });

  // Handle dark logo file selection
  const handleDarkLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      darkLogoUploadMutation.mutate(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setDarkLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle dark square logo file selection
  const handleDarkSquareLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Square logo must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      darkSquareLogoUploadMutation.mutate(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setDarkSquareLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-6 sm:h-8 w-6 sm:w-8" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Manage your organization profile and preferences
          </p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>
              Basic information about your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your Organization Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0123"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization Address</CardTitle>
            <CardDescription>
              Your organization's physical location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <Label>State/Province</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP/Postal Code</Label>
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="94105"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization Logos</CardTitle>
            <CardDescription>
              Upload your organization's logos for different uses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Logo */}
            <div>
              <Label className="text-base font-medium">Main Logo</Label>
              <p className="text-sm text-muted-foreground mb-3">Used in headers and general branding</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Organization logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleLogoSelect}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button 
                      variant="outline" 
                      asChild
                      disabled={logoUploadMutation.isPending}
                    >
                      <span className="cursor-pointer">
                        {logoUploadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or SVG. Max size 2MB.
                  </p>
                  {logoPreview && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLogoPreview("")}
                    >
                      Remove Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Square Logo */}
            <div>
              <Label className="text-base font-medium">Square Logo</Label>
              <p className="text-sm text-muted-foreground mb-3">Used in collapsed menu and as favicon (recommended: 1:1 aspect ratio)</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden">
                  {squareLogoPreview ? (
                    <img 
                      src={squareLogoPreview} 
                      alt="Square organization logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleSquareLogoSelect}
                    className="hidden"
                    id="square-logo-upload"
                  />
                  <label htmlFor="square-logo-upload">
                    <Button 
                      variant="outline" 
                      asChild
                      disabled={squareLogoUploadMutation.isPending}
                    >
                      <span className="cursor-pointer">
                        {squareLogoUploadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or SVG. Max size 2MB. Square format recommended.
                  </p>
                  {squareLogoPreview && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSquareLogoPreview("")}
                    >
                      Remove Square Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dark Mode Logos Card */}
        <Card>
          <CardHeader>
            <CardTitle>Dark Mode Logos</CardTitle>
            <CardDescription>
              Upload separate logos for dark mode (optional - falls back to main logos if not set)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dark Mode Main Logo */}
            <div>
              <Label className="text-base font-medium">Dark Mode Main Logo</Label>
              <p className="text-sm text-muted-foreground mb-3">Used in headers when dark mode is active</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-zinc-900 overflow-hidden">
                  {darkLogoPreview ? (
                    <img 
                      src={darkLogoPreview} 
                      alt="Dark mode logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-zinc-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleDarkLogoSelect}
                    className="hidden"
                    id="dark-logo-upload"
                  />
                  <label htmlFor="dark-logo-upload">
                    <Button 
                      variant="outline" 
                      asChild
                      disabled={darkLogoUploadMutation.isPending}
                    >
                      <span className="cursor-pointer">
                        {darkLogoUploadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or SVG. Max size 2MB.
                  </p>
                  {darkLogoPreview && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDarkLogoPreview("")}
                    >
                      Remove Dark Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Dark Mode Square Logo */}
            <div>
              <Label className="text-base font-medium">Dark Mode Square Logo</Label>
              <p className="text-sm text-muted-foreground mb-3">Used in collapsed menu when dark mode is active</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-zinc-900 overflow-hidden">
                  {darkSquareLogoPreview ? (
                    <img 
                      src={darkSquareLogoPreview} 
                      alt="Dark mode square logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-zinc-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleDarkSquareLogoSelect}
                    className="hidden"
                    id="dark-square-logo-upload"
                  />
                  <label htmlFor="dark-square-logo-upload">
                    <Button 
                      variant="outline" 
                      asChild
                      disabled={darkSquareLogoUploadMutation.isPending}
                    >
                      <span className="cursor-pointer">
                        {darkSquareLogoUploadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Choose File
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or SVG. Max size 2MB. Square format recommended.
                  </p>
                  {darkSquareLogoPreview && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDarkSquareLogoPreview("")}
                    >
                      Remove Dark Square Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}