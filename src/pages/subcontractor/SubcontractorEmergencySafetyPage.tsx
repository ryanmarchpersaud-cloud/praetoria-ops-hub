import { useSubcontractorProfile, useSubcontractorAssignments } from '@/hooks/useSubcontractor';
import { useSubcontractorEmergencyProfile, useUpdateSubcontractorEmergency, usePropertyEmergencyInfo } from '@/hooks/useEmergencyData';
import { EmergencySOSPanel } from '@/components/EmergencySOSPanel';
import { SiteEmergencyCard } from '@/components/SiteEmergencyCard';
import { MedicalAlertCard } from '@/components/MedicalAlertCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, Phone, User, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SubcontractorEmergencySafetyPage() {
  const navigate = useNavigate();
  const { data: profile } = useSubcontractorProfile();
  const { data: emergencyData } = useSubcontractorEmergencyProfile();
  const updateEmergency = useUpdateSubcontractorEmergency();
  const { data: assignments = [] } = useSubcontractorAssignments(profile?.id);
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAssignment = assignments.find((a: any) => a.visits?.service_date === todayStr &&
    (a.assignment_status === 'in_progress' || a.assignment_status === 'assigned' || a.assignment_status === 'en_route'));
  const propertyId = (todayAssignment as any)?.property_id || (todayAssignment as any)?.visits?.property_id;
  const { data: propertyInfo } = usePropertyEmergencyInfo(propertyId);

  const startEditContact = () => {
    setContactForm({
      emergency_contact_name: emergencyData?.emergency_contact_name || '',
      emergency_contact_phone: emergencyData?.emergency_contact_phone || '',
      emergency_contact_relationship: emergencyData?.emergency_contact_relationship || '',
      secondary_emergency_contact_name: emergencyData?.secondary_emergency_contact_name || '',
      secondary_emergency_contact_phone: emergencyData?.secondary_emergency_contact_phone || '',
      secondary_emergency_contact_relationship: emergencyData?.secondary_emergency_contact_relationship || '',
    });
    setEditingContact(true);
  };

  const saveContacts = async () => {
    setSaving(true);
    try {
      await updateEmergency.mutateAsync(contactForm);
      setEditingContact(false);
      toast.success('Emergency contacts updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <h1 className="text-lg font-bold text-foreground">Emergency & Safety</h1>
      </div>

      <EmergencySOSPanel
        siteAddress={propertyInfo?.address_line_1 || undefined}
        siteCity={propertyInfo?.city || undefined}
        musterPointName={propertyInfo?.muster_point_name || undefined}
        musterPointMapNotes={propertyInfo?.muster_point_map_notes || undefined}
        adminPhone="306-555-0100"
        onReportIncident={() => navigate('/subcontractor/incidents/new')}
        highRisk={propertyInfo?.high_risk_flag}
        reporterName={profile?.company_name || 'Subcontractor'}
        reporterRole="subcontractor"
      />

      {propertyInfo && (
        <SiteEmergencyCard
          musterPointName={propertyInfo.muster_point_name}
          musterPointDescription={propertyInfo.muster_point_description}
          musterPointPhotoUrl={propertyInfo.muster_point_photo_url}
          emergencyExitNotes={propertyInfo.emergency_exit_notes}
          firstAidKitLocation={propertyInfo.first_aid_kit_location}
          fireExtinguisherLocation={propertyInfo.fire_extinguisher_location}
          siteEmergencyNotes={propertyInfo.site_emergency_notes}
          highRisk={propertyInfo.high_risk_flag}
          cautionNotes={propertyInfo.caution_notes}
        />
      )}

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> My Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!editingContact ? (
            <>
              {emergencyData?.emergency_contact_name ? (
                <div className="space-y-2">
                  <ContactRow
                    name={emergencyData.emergency_contact_name}
                    phone={emergencyData.emergency_contact_phone}
                    relationship={emergencyData.emergency_contact_relationship}
                    primary
                  />
                  {emergencyData.secondary_emergency_contact_name && (
                    <ContactRow
                      name={emergencyData.secondary_emergency_contact_name}
                      phone={emergencyData.secondary_emergency_contact_phone}
                      relationship={emergencyData.secondary_emergency_contact_relationship}
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No emergency contacts on file.</p>
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={startEditContact}>
                {emergencyData?.emergency_contact_name ? 'Edit Contacts' : 'Add Emergency Contacts'}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Primary Contact</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={contactForm.emergency_contact_name || ''} onChange={e => setContactForm(f => ({ ...f, emergency_contact_name: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={contactForm.emergency_contact_phone || ''} onChange={e => setContactForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Input value={contactForm.emergency_contact_relationship || ''} onChange={e => setContactForm(f => ({ ...f, emergency_contact_relationship: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium pt-2">Secondary Contact (optional)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={contactForm.secondary_emergency_contact_name || ''} onChange={e => setContactForm(f => ({ ...f, secondary_emergency_contact_name: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={contactForm.secondary_emergency_contact_phone || ''} onChange={e => setContactForm(f => ({ ...f, secondary_emergency_contact_phone: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Input value={contactForm.secondary_emergency_contact_relationship || ''} onChange={e => setContactForm(f => ({ ...f, secondary_emergency_contact_relationship: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingContact(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={saveContacts} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MedicalAlertCard
        data={emergencyData}
        onSave={async (fields) => { await updateEmergency.mutateAsync(fields); }}
      />
    </div>
  );
}

function ContactRow({ name, phone, relationship, primary }: {
  name: string; phone?: string | null; relationship?: string | null; primary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">{name}</p>
          <p className="text-[10px] text-muted-foreground">{relationship} {primary ? '· Primary' : '· Secondary'}</p>
        </div>
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Phone className="h-3.5 w-3.5 text-emerald-600" />
        </a>
      )}
    </div>
  );
}
