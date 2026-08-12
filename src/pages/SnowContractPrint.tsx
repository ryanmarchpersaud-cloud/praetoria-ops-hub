import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { format } from 'date-fns';

const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="mb-5 break-inside-avoid">
    <h3 className="text-sm font-extrabold uppercase tracking-wide border-b-2 border-[#0F172A] pb-1 mb-2">
      {n}. {title}
    </h3>
    <div className="text-[13px] leading-relaxed space-y-2">{children}</div>
  </section>
);

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-0.5">
    {items.map((i) => <li key={i}>{i}</li>)}
  </ul>
);

const SignLine = ({ label }: { label: string }) => (
  <div className="mt-6">
    <div className="border-b border-black h-6" />
    <p className="text-[11px] uppercase tracking-wide text-gray-600 mt-1">{label}</p>
  </div>
);

export default function SnowContractPrint() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('print') === '1') {
      const handle = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(handle);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 print:p-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 justify-end mb-4 print:hidden">
          <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Save as PDF</Button>
        </div>

        {/* Letterhead */}
        <div className="rounded-lg p-5 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 text-white print:rounded-none" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <img src="/praetoria-logo-white.png" alt="Praetoria Group" className="h-28 w-28 sm:h-40 sm:w-40 object-contain flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow">Praetoria Snow &amp; Ice</h1>
            <p className="text-sm sm:text-base text-white/95 mt-1">A division of Praetoria Group</p>
            <p className="text-sm sm:text-base text-white/95 mt-2">2282 Toronto Street, Regina, Saskatchewan S4P 1N4</p>
            <p className="text-sm sm:text-base text-white/95">support@praetoriagroup.ca • (306) 737-6269</p>
            <h2 className="text-base sm:text-lg font-bold mt-4 inline-block bg-white text-[#0F172A] px-4 py-1.5 rounded">Seasonal Snow Removal Service Agreement</h2>
          </div>
        </div>

        <p className="text-center text-sm font-bold uppercase tracking-widest text-[#1E3A8A] mb-5">2026–2027 Winter Season</p>

        <p className="text-[13px] mb-4">
          This Seasonal Snow Removal Service Agreement (“Agreement”) is entered into between the Service Provider and the Customer identified below.
        </p>

        {/* Parties */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-[13px] break-inside-avoid">
          <div className="border border-gray-300 rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Service Provider</p>
            <p className="font-bold">Praetoria Snow &amp; Ice / Praetoria Group</p>
            <p>2282 Toronto Street</p>
            <p>Regina, Saskatchewan S4P 1N4</p>
            <p>support@praetoriagroup.ca</p>
            <p>(306) 737-6269</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Customer</p>
            <p className="font-bold">Future Transfer Co. Inc.</p>
            <p>Attention: John Champagne</p>
            <p>555 Henderson Drive</p>
            <p>Regina, Saskatchewan</p>
            <p>john.champagne@futuretransfer.com</p>
            <p>(639) 554-1376</p>
          </div>
        </div>

        <Section n={1} title="Service Property">
          <p>The services under this Agreement apply to:</p>
          <p className="font-semibold">Future Transfer Co. Inc.<br />555 Henderson Drive<br />Regina, Saskatchewan</p>
          <p>This Agreement applies to <strong>one property location only</strong>.</p>
        </Section>

        <Section n={2} title="Contract Period">
          <p>The seasonal service period will run from <strong>October 1, 2026 through April 30, 2027</strong>.</p>
        </Section>

        <Section n={3} title="Scope of Snow Removal Services">
          <p>Praetoria Snow &amp; Ice will provide parking-area snow-removal services within the approved service areas of the property, including:</p>
          <Bullets items={[
            'Parking areas',
            'Drive lanes',
            'Vehicle entrances and exits',
            'Approved loading and receiving vehicle routes',
            'Approved garbage-access vehicle routes',
            'Approved loading-door access areas and related vehicle-access sections identified during the site walkthrough',
            'Pushing, piling, stacking and management of snow within the approved on-site snow-storage areas',
          ]} />
          <p>The exact service boundaries, loading-door areas and snow-storage locations are those identified and discussed during the site walkthrough between Praetoria Snow &amp; Ice and the Customer.</p>
        </Section>

        <Section n={4} title="On-Site Snow Storage">
          <p>Praetoria Snow &amp; Ice completed a site visit before preparation of this Agreement.</p>
          <p>Based on the site conditions observed during the walkthrough, the property has sufficient space for snow to be stored on-site.</p>
          <p>Snow will be pushed and piled in the <strong>approved front and rear snow-storage areas identified during the site walkthrough</strong>.</p>
          <p>Off-site snow hauling is not included or anticipated under this Agreement.</p>
        </Section>

        <Section n={5} title="Equipment and Unit Rates">
          <table className="w-full text-[13px] border border-gray-300">
            <thead>
              <tr className="text-white" style={{ background: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <th className="text-left p-2 font-semibold">Equipment</th>
                <th className="text-right p-2 font-semibold w-48">Rate (operator included)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-300 align-top">
                <td className="p-2">
                  <p className="font-semibold">A. Parking-Lot Snow Clearing – Plow Truck</p>
                  <p className="text-gray-700">Appropriately equipped plow truck used to clear approved parking areas, drive lanes, entrances, exits, loading routes and other approved vehicle-access areas.</p>
                </td>
                <td className="p-2 text-right font-bold whitespace-nowrap">$225.00 / hour<br /><span className="font-normal text-gray-700">per equipment unit</span></td>
              </tr>
              <tr className="border-t border-gray-300 align-top">
                <td className="p-2">
                  <p className="font-semibold">B. Parking-Lot Snow Clearing – Tractor, Bobcat, Skid-Steer or Loader</p>
                  <p className="text-gray-700">Used for snow clearing, pushing, relocation, stacking and management within the approved service area.</p>
                </td>
                <td className="p-2 text-right font-bold whitespace-nowrap">$225.00 / hour<br /><span className="font-normal text-gray-700">per equipment unit</span></td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section n={6} title="Equipment Dispatch">
          <p>The two equipment categories listed above do <strong>not</strong> mean that two pieces of equipment will automatically be dispatched or billed for each snowfall.</p>
          <p>Under normal snowfall conditions, Praetoria Snow &amp; Ice intends to dispatch <strong>one appropriate equipment unit</strong> to the property.</p>
          <p>The equipment selected may vary depending on:</p>
          <Bullets items={['Snowfall depth', 'Snow conditions', 'Site conditions', 'Equipment availability', 'Operational requirements']} />
          <p>For example, a plow truck may be dispatched during one snowfall, while a Bobcat, tractor, skid-steer or loader may be more appropriate during another event.</p>
          <p>A second equipment unit will normally be dispatched only when conditions reasonably require additional equipment, including severe or heavy snowfall events or circumstances where additional equipment is reasonably necessary to complete the work efficiently.</p>
          <p>Each equipment unit actually used will be billed separately at the applicable hourly rate.</p>
        </Section>

        <Section n={7} title="Unit-Rate Contract — No Fixed Seasonal Total">
          <p>This Agreement is based on <strong>unit-rate pricing</strong> and does not establish a fixed seasonal contract total.</p>
          <p>The Customer will be invoiced according to:</p>
          <Bullets items={['Equipment actually dispatched', 'Recorded equipment hours', 'Authorized services actually performed']} />
          <p>The two equipment rates are <strong>not automatically added together</strong>. Only equipment actually used and recorded during a service visit will be billed.</p>
        </Section>

        <Section n={8} title="Snowfall Service Trigger">
          <p>The Customer must select the snowfall accumulation at which seasonal service is to be automatically dispatched.</p>
          <p className="font-semibold">Selected Trigger:</p>
          <div className="space-y-1">
            {['Every snowfall', '5 cm', '7 cm', '10 cm'].map((t) => (
              <p key={t} className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 border border-black" /> {t}</p>
            ))}
            <p className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 border border-black" /> Other: <span className="inline-block border-b border-black w-56" /></p>
          </div>
          <p>Once the selected accumulation trigger has been reached, Praetoria Snow &amp; Ice may dispatch service without requiring the Customer to place a separate call for each qualifying snowfall.</p>
        </Section>

        <Section n={9} title="Seasonal Service Priority">
          <p>As an active seasonal winter-service customer, Future Transfer Co. Inc. will receive priority service during widespread snowfall events.</p>
          <p>Praetoria Snow &amp; Ice will target service approximately <strong>within two hours after the agreed snowfall trigger has been reached</strong>, subject to:</p>
          <Bullets items={['Continuing snowfall', 'Severe weather', 'Road safety', 'Road closures', 'Property access', 'Equipment availability', 'Equipment failure', 'Other conditions outside Praetoria Snow & Ice’s reasonable operational control']} />
          <p>The stated response time is an operational service target and may be affected by actual winter conditions.</p>
        </Section>

        <Section n={10} title="Site Access and Obstructions">
          <p>The Customer is responsible for keeping the approved service areas reasonably accessible.</p>
          <p>The Customer should identify or make Praetoria Snow &amp; Ice aware of obstacles that may be concealed by snow, including:</p>
          <Bullets items={['Curbs', 'Speed bumps', 'Parking blocks', 'Drains', 'Utility covers', 'Electrical cords', 'Private equipment', 'Other concealed objects or hazards']} />
          <p>Parked vehicles, trailers, delivery vehicles, locked gates, equipment or other obstructions may prevent complete clearing of an affected area.</p>
          <p>If Praetoria Snow &amp; Ice is required to return after an obstruction has been removed, the return visit may be separately billable.</p>
        </Section>

        <Section n={11} title="Services Not Included">
          <p>Unless separately quoted and authorized in writing, this Agreement does <strong>not</strong> include:</p>
          <Bullets items={['Pedestrian or sidewalk snow clearing', 'Pedestrian walkways', 'Sanding', 'De-icing', 'Salt', 'Sand or other ice-control materials', 'Off-site snow hauling', 'Snow disposal or dumping', 'Roof snow removal', 'Roof-ice removal', 'Snow melting', 'Spring cleanup']} />
        </Section>

        <Section n={12} title="Service Documentation">
          <p>Praetoria Snow &amp; Ice will document service activity when applicable, including:</p>
          <Bullets items={['Service date', 'Arrival time', 'Departure time', 'Equipment used', 'Recorded equipment hours', 'Work completed', 'Available before-and-after or service photographs']} />
          <p>These records may be used to verify completed services and support invoicing.</p>
        </Section>

        <Section n={13} title="Praetoria Operations Hub Customer Portal">
          <p>Future Transfer Co. Inc. will have access to a customer portal through the <strong>Praetoria Operations Hub</strong>. The Customer may use the portal to access available information relating to its account and snow-removal services, including:</p>
          <Bullets items={['Quotations', 'Invoices', 'Service history', 'Service records', 'Available service photographs', 'Payment information']} />
          <p>Portal access may be available through the Praetoria Group customer portal and supported Praetoria Group applications.</p>
        </Section>

        <Section n={14} title="Snow Service Quality Guarantee">
          <p>Praetoria Snow &amp; Ice will perform the approved snow-removal services with reasonable care and in accordance with the agreed scope and selected snowfall trigger.</p>
          <p>If an approved service area is missed or was not serviced as authorized, the Customer should notify Praetoria Snow &amp; Ice as soon as reasonably possible, preferably within 24 hours of service.</p>
          <p>When a service deficiency is confirmed and conditions permit, Praetoria Snow &amp; Ice will return to correct the affected area without an additional labour charge.</p>
          <p>This guarantee does not mean that surfaces will remain continuously bare, dry or completely free from snow or ice following service. Changing winter conditions may include:</p>
          <Bullets items={['New snowfall', 'Continuing precipitation', 'Drifting snow', 'Blowing snow', 'Freezing rain', 'Refreezing', 'Meltwater', 'Roof runoff', 'Snow deposited by vehicles', 'Snow moved by municipal equipment or other parties']} />
        </Section>

        <Section n={15} title="Payment">
          <p>Invoices will be based on the actual authorized equipment and recorded service time. Payment may be made by:</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border border-gray-300 rounded p-2"><p className="font-semibold">Interac e-Transfer</p><p>payments@praetoriasnowandice.ca</p></div>
            <div className="border border-gray-300 rounded p-2"><p className="font-semibold">Credit Card</p><p>Through Praetoria Snow &amp; Ice’s approved Stripe payment system or customer portal.</p></div>
            <div className="border border-gray-300 rounded p-2"><p className="font-semibold">EFT / Wire Transfer</p><p>Banking information provided upon request or on the applicable invoice.</p></div>
            <div className="border border-gray-300 rounded p-2"><p className="font-semibold">Cheque</p><p>Payable to Praetoria Snow &amp; Ice.</p></div>
          </div>
          <p>Applicable taxes will be added to invoices as required.</p>
        </Section>

        <Section n={16} title="Customer Acknowledgement">
          <p>By signing below, the Customer confirms that it has reviewed and accepts:</p>
          <Bullets items={['The service property', 'Seasonal contract period', 'Scope of work', 'Approved loading and vehicle-access areas', 'Approved on-site snow-storage areas', 'Selected snowfall trigger', 'Equipment dispatch provisions', 'Unit-rate pricing', 'Service priority and response target', 'Excluded services', 'Site-access requirements', 'Service documentation provisions', 'Snow Service Quality Guarantee']} />
          <p>The Customer also acknowledges that this is a <strong>unit-rate seasonal service contract and not a fixed-price seasonal contract</strong>.</p>
        </Section>

        {/* Signatures */}
        <div className="grid sm:grid-cols-2 gap-8 mt-8 break-inside-avoid">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide border-b-2 border-[#0F172A] pb-1">Customer</h3>
            <p className="font-bold text-[13px] mt-2">Future Transfer Co. Inc.</p>
            <p className="text-[13px] text-gray-700">Authorized Representative</p>
            <SignLine label="Name" />
            <SignLine label="Title" />
            <SignLine label="Signature" />
            <SignLine label="Date" />
            <SignLine label="Selected Snowfall Trigger" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide border-b-2 border-[#0F172A] pb-1">Service Provider</h3>
            <p className="font-bold text-[13px] mt-2">Praetoria Snow &amp; Ice / Praetoria Group</p>
            <p className="text-[13px] text-gray-700">Authorized Representative: Ryan Steven Persaud</p>
            <SignLine label="Signature" />
            <SignLine label="Date" />
          </div>
        </div>

        <div className="rounded-lg pt-3 mt-8 text-xs text-center text-white p-3" style={{ background: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          Praetoria Snow &amp; Ice • Praetoria Group • 2282 Toronto Street, Regina, Saskatchewan S4P 1N4 • support@praetoriagroup.ca • (306) 737-6269 • Generated {format(new Date(), 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}
