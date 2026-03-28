import { useAuth } from '@/hooks/useAuth';
import { useWorkerProfile } from '@/hooks/useWorkerProfile';
import { useWorkerMedicalProfile, useUpdateWorkerMedical, useWorkerEmergencyContacts, usePropertyEmergencyInfo } from '@/hooks/useEmergencyData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmergencySOSPanel } from '@/components/EmergencySOSPanel';
import { SiteEmergencyCard } from '@/components/SiteEmergencyCard';
import { MedicalAlertCard } from '@/components/MedicalAlertCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Phone, User, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function WorkerEmergencySafetyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: workerProfile } = useWorkerProfile();
  const { data: medicalData } = useWorkerMedicalProfile();
  const updateMedical = useUpdateWorkerMedical();
  const { data: emergencyContacts = [] } = useWorkerEmergencyContacts();
  const todayStr = new Date().toISOString().split('T')[0];

  // Get current/next visit's property for site safety info
  const { data: currentVisit } = useQuery({
    queryKey: ['worker_current_visit_for_safety', todayStr, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('visits')
        .select('id, property_id, properties(id, property_name, address_line_1, city, high_risk_flag, caution_notes, muster_point_name, muster_point_description, muster_point_photo_url, muster_point_map_notes, emergency_exit_notes, first_aid_kit_location, fire_extinguisher_location, site_emergency_notes), customers(phone), jobs!inner(assigned_to)')
        .eq('service_date', todayStr)
        .eq('jobs.assigned_to', user!.id)
        .in('visit_status', ['In Progress', 'En Route', 'Scheduled'])
        .order('arrival_time', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const property = currentVisit?.properties as any;

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <h1 className="text-lg font-bold text-foreground">Emergency & Safety</h1>
      </div>

      {/* SOS Panel */}
      <EmergencySOSPanel
        siteAddress={property?.address_line_1}
        siteCity={property?.city}
        musterPointName={property?.muster_point_name}
        musterPointMapNotes={property?.muster_point_map_notes}
        adminPhone="306-555-0100"
        siteContactPhone={(currentVisit?.customers as any)?.phone}
        onReportIncident={() => navigate('/worker/incidents/new')}
        highRisk={property?.high_risk_flag}
        reporterName={workerProfile?.first_name ? `${workerProfile.first_name} ${workerProfile.last_name || ''}`.trim() : user?.email || 'Unknown'}
        reporterRole="worker"
      />

      {/* Current Site Safety */}
      {property && (
        <SiteEmergencyCard
          musterPointName={property.muster_point_name}
          musterPointDescription={property.muster_point_description}
          musterPointPhotoUrl={property.muster_point_photo_url}
          emergencyExitNotes={property.emergency_exit_notes}
          firstAidKitLocation={property.first_aid_kit_location}
          fireExtinguisherLocation={property.fire_extinguisher_location}
          siteEmergencyNotes={property.site_emergency_notes}
          highRisk={property.high_risk_flag}
          cautionNotes={property.caution_notes}
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
          {emergencyContacts.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground">No emergency contacts on file.</p>
              <Link to="/worker/emergency-contact" className="text-xs text-primary font-medium mt-1 inline-block">
                Add Emergency Contact →
              </Link>
            </div>
          ) : (
            <>
              {emergencyContacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{c.contact_name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.relationship} {c.is_primary ? '· Primary' : ''}</p>
                    </div>
                  </div>
                  {c.phone_primary && (
                    <a href={`tel:${c.phone_primary}`} className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    </a>
                  )}
                </div>
              ))}
              <Link to="/worker/emergency-contact" className="text-[11px] text-primary font-medium flex items-center gap-0.5 mt-1">
                Manage Contacts <ChevronRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Medical Alert Profile */}
      <MedicalAlertCard
        data={medicalData}
        onSave={async (fields) => { await updateMedical.mutateAsync(fields); }}
      />
    </div>
  );
}
