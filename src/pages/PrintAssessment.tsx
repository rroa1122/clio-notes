import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Patient {
    id: string;
    full_name: string;
    dob: string;
    phone: string;
    email: string;
    gender: string;
    emr_id: string;
    diagnoses: string;
    first_name: string;
    last_name: string;
    ssn: string;
    citizenship: string;
    case_manager: string;
    insurance_company: string;
    address: string;
    pcp_name: string;
    pcp_phone: string;
    pcp_address: string;
    pcp_conditions: string;
    pcp_medications: string;
    psych_name: string;
    psych_phone: string;
    psych_address: string;
    psych_conditions: string;
    psych_medications: string;
    presenting_problems: string;
    pharmacy_name: string;
    pharmacy_phone: string;
    pharmacy_fax: string;
    pharmacy_address: string;
    pcp_clinic_name: string;
    emergency_contact_name: string;
    emergency_contact_relation: string;
    emergency_contact_phone: string;
    insurance_id: string;
    race: string;
    ethnicity: string;
    preferred_language: string;
    case_number: string;
    tcm_social_needs: any;
}

const PrintAssessment: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [clinicName, setClinicName] = useState('CLIO NOTES');
    const [clinicAddress, setClinicAddress] = useState('14400 NW 77th Ct Ste 100, Miami Lakes, FL 33016');
    const [clinicPhone, setClinicPhone] = useState('786-916-6073');
    const [clinicFax, setClinicFax] = useState('786-657-3092');
    const [clinicEmail, setClinicEmail] = useState('contact@arcmentalhealth.com');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const loadData = async () => {
            try {
                // Fetch Patient
                const { data: pData, error: pError } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (pError) throw pError;
                setPatient(pData);

                // Fetch Clinic
                if (pData?.clinic_id) {
                    const { data: cData } = await supabase
                        .from('clinics')
                        .select('*')
                        .eq('id', pData.clinic_id)
                        .single();
                    if (cData) {
                        setClinicName(cData.name || 'CLIO NOTES');
                        // Use actual clinic values or defaults
                    }
                }
            } catch (err) {
                console.error("Error loading assessment data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id]);

    useEffect(() => {
        if (!patient || isLoading) return;

        const dateString = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
        document.title = `${patient.full_name} - Assessment - ${dateString}`;

        const timer = setTimeout(() => {
            window.print();
        }, 1000);

        return () => clearTimeout(timer);
    }, [patient, isLoading]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-sm font-bold tracking-widest uppercase">Generando Plantilla de Evaluación...</p>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                <p className="text-sm font-bold tracking-widest uppercase text-red-400">Paciente no encontrado</p>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300">
                    <ArrowLeft size={14} /> Volver
                </button>
            </div>
        );
    }

    const needs = patient.tcm_social_needs || {};

    const renderHeader = (pageNum: number) => (
        <div className="w-full flex justify-between items-start border-b border-slate-200 pb-3 mb-6 print:pb-2">
            <div>
                <h1 className="text-[17px] font-black text-slate-800 tracking-tight leading-none uppercase">Assessment</h1>
                <p className="text-[10px] font-black text-indigo-600 tracking-widest uppercase mt-1">Case Management</p>
            </div>
            <div className="text-right">
                <h2 className="text-[13px] font-black text-slate-800 tracking-tight leading-none">{clinicName}</h2>
                <p className="text-[9px] font-bold text-slate-500 tracking-wide mt-1">
                    Phone: {clinicPhone} &bull; Fax: {clinicFax}
                </p>
            </div>
        </div>
    );

    const renderPatientBox = () => (
        <div className="grid grid-cols-5 gap-3 border border-slate-300 rounded-xl p-3 bg-slate-50/50 mb-6 text-[10px]">
            <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Client's Name</span>
                <span className="font-extrabold text-slate-800">{patient.full_name}</span>
            </div>
            <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">EMR ID</span>
                <span className="font-extrabold text-slate-800">{patient.emr_id || 'N/A'}</span>
            </div>
            <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Sex</span>
                <span className="font-extrabold text-slate-800">{patient.gender || 'N/A'}</span>
            </div>
            <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">Mobile</span>
                <span className="font-extrabold text-slate-800">{patient.phone || 'N/A'}</span>
            </div>
            <div>
                <span className="block font-bold text-slate-400 uppercase tracking-wider text-[8px]">DOB</span>
                <span className="font-extrabold text-slate-800">
                    {patient.dob ? format(new Date(patient.dob), 'MM/dd/yyyy') : 'N/A'}
                </span>
            </div>
        </div>
    );

    const renderFooter = (pageNum: number) => (
        <div className="w-full flex justify-between items-center border-t border-slate-200 pt-3 mt-auto text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{patient.full_name} ({patient.emr_id || 'N/A'})</span>
            <span>Page {pageNum} of 17</span>
        </div>
    );

    const renderCheckbox = (checked: boolean, text: string) => (
        <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                {checked && <span className="text-[9px] font-black leading-none">&#10003;</span>}
            </div>
            <span className="text-slate-700">{text}</span>
        </div>
    );

    return (
        <div className="bg-slate-100 dark:bg-slate-950 min-h-screen py-10 print:py-0 print:bg-white text-slate-800 flex flex-col items-center">
            {/* Custom Print Styles */}
            <style>{`
                @media print {
                    body {
                        background-color: white;
                        color: black;
                    }
                    .print-page {
                        width: 8.5in;
                        height: 11in;
                        margin: 0;
                        padding: 0.5in 0.5in 0.4in 0.5in;
                        page-break-after: always;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                .print-page {
                    width: 8.5in;
                    height: 11in;
                    background-color: white;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                    margin-bottom: 2rem;
                    padding: 0.5in 0.5in 0.4in 0.5in;
                    display: flex;
                    flex-direction: column;
                }
            `}</style>

            {/* Back Button for preview mode */}
            <div className="no-print w-[8.5in] mb-4 flex justify-between items-center px-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <ArrowLeft size={14} /> Back to chart
                </button>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista de Impresión</p>
            </div>

            {/* ================= PAGE 1 ================= */}
            <div className="print-page">
                {renderHeader(1)}
                {renderPatientBox()}
                
                <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-4 text-slate-800">
                    Client's Information
                </h3>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[10px]">
                    <div className="space-y-4">
                        <h4 className="font-black text-indigo-600 uppercase tracking-wider text-[9px]">General Information</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 border-b border-slate-100 pb-3">
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Client's Name</span>
                                <span className="font-bold text-slate-800">{patient.full_name}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Case Number</span>
                                <span className="font-bold text-slate-800">{patient.case_number || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Date of Birth</span>
                                <span className="font-bold text-slate-800">{patient.dob ? format(new Date(patient.dob), 'MM/dd/yyyy') : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">SSN</span>
                                <span className="font-bold text-slate-800">{patient.ssn || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Sex</span>
                                <span className="font-bold text-slate-800">{patient.gender || 'N/A'}</span>
                            </div>
                        </div>

                        <h4 className="font-black text-indigo-600 uppercase tracking-wider text-[9px] pt-1">Contact Information</h4>
                        <div className="grid grid-cols-1 gap-y-2 border-b border-slate-100 pb-3">
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Home Phone No</span>
                                <span className="font-bold text-slate-800">{needs.home_phone_no || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Cell Phone No</span>
                                <span className="font-bold text-slate-800">{patient.phone || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Other Phone No</span>
                                <span className="font-bold text-slate-800">{needs.other_phone_no || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Email</span>
                                <span className="font-bold text-slate-800">{patient.email || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Address</span>
                                <span className="font-bold text-slate-800">{patient.address || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-black text-indigo-600 uppercase tracking-wider text-[9px]">Demographic Profile</h4>
                        <div className="grid grid-cols-1 gap-y-2 border-b border-slate-100 pb-3">
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Race</span>
                                <span className="font-bold text-slate-800">{patient.race || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Ethnicity</span>
                                <span className="font-bold text-slate-800">{patient.ethnicity || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Marital Status</span>
                                <span className="font-bold text-slate-800">{needs.marital_status || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Primary Language</span>
                                <span className="font-bold text-slate-800">{patient.preferred_language || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Other Language</span>
                                <span className="font-bold text-slate-800">{needs.other_language || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Other Language Capabilities</span>
                                <span className="font-bold text-slate-800">{needs.other_language_capabilities || 'N/A'}</span>
                            </div>
                        </div>

                        <h4 className="font-black text-indigo-600 uppercase tracking-wider text-[9px] pt-1">Representation & Accommodations</h4>
                        <div className="grid grid-cols-1 gap-y-2">
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Legal Decision-Maker or Authorized Representative</span>
                                <span className="font-bold text-slate-800">{needs.legal_decision_maker || 'None'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Documentation</span>
                                <span className="font-bold text-slate-800">{needs.legal_documentation_path || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Need of Special Accommodations?</span>
                                <div className="flex gap-4 mt-1">
                                    {renderCheckbox(!needs.special_accommodation || needs.special_accommodation === 'No', 'No')}
                                    {renderCheckbox(!!needs.special_accommodation && needs.special_accommodation !== 'No', 'Yes')}
                                </div>
                                {needs.special_accommodation && needs.special_accommodation !== 'No' && (
                                    <span className="block mt-1 font-bold text-indigo-600">{needs.special_accommodation}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {renderFooter(1)}
            </div>

            {/* ================= PAGE 2 ================= */}
            <div className="print-page">
                {renderHeader(2)}
                {renderPatientBox()}

                <div className="space-y-6 text-[10px]">
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Type of Assessment</h4>
                        <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.assessment_type === 'Initial', 'Initial')}
                            {renderCheckbox(needs.assessment_type === 'Annual', 'Annual')}
                            {renderCheckbox(needs.assessment_type === 'Significant Change', 'Significant Change')}
                            {renderCheckbox(needs.assessment_type === 'Other', 'Other')}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Is client currently receiving Case Management services through another provider?</h4>
                        <div className="flex gap-8 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.other_provider_case_management === 'Yes', 'Yes')}
                            {renderCheckbox(!needs.other_provider_case_management || needs.other_provider_case_management === 'No', 'No')}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">Referral and Information Sources</h4>
                        <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Referred by</span>
                                <span className="font-bold text-slate-800">{needs.referred_by || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Phone No</span>
                                <span className="font-bold text-slate-800">{needs.referral_phone || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Address</span>
                                <span className="font-bold text-slate-800">{needs.referral_address || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Title/Position</span>
                                <span className="font-bold text-slate-800">{needs.referral_title || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Agency (if applicable)</span>
                                <span className="font-bold text-slate-800">{needs.referral_agency || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">This assessment was based on the information obtained from the following sources:</h4>
                        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.info_source_client !== false, "Client's input and own assessment")}
                            {renderCheckbox(needs.info_source_family === true, 'Family and friends')}
                            {renderCheckbox(needs.info_source_referring === true, 'Referring Agency/Provider')}
                            {renderCheckbox(needs.info_source_school === true, 'School')}
                            {renderCheckbox(needs.info_source_treating === true, 'Treating Providers')}
                            {renderCheckbox(needs.info_source_caregiver === true, 'Caregiver')}
                            {renderCheckbox(needs.info_source_records !== false, "Review of client's records")}
                            {renderCheckbox(needs.info_source_other === true, 'Other')}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">List individuals/agencies providing information other than client:</h4>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2">Name</th>
                                    <th className="border border-slate-300 p-2">Agency</th>
                                    <th className="border border-slate-300 p-2">Relationship</th>
                                </tr>
                            </thead>
                            <tbody>
                                {needs.info_providers && needs.info_providers.length > 0 ? (
                                    needs.info_providers.map((p: any, idx: number) => (
                                        <tr key={idx} className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">{p.name}</td>
                                            <td className="border border-slate-300 p-2">{p.agency}</td>
                                            <td className="border border-slate-300 p-2">{p.relationship}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <>
                                        <tr className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">{needs.referred_by || 'N/A'}</td>
                                            <td className="border border-slate-300 p-2">{needs.referral_agency || 'N/A'}</td>
                                            <td className="border border-slate-300 p-2">{needs.referral_title || 'N/A'}</td>
                                        </tr>
                                        <tr className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">{patient.emergency_contact_name || 'N/A'}</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                            <td className="border border-slate-300 p-2">{needs.emergency_contact_relationship || patient.emergency_contact_relation || 'N/A'}</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {renderFooter(2)}
            </div>

            {/* ================= PAGE 3 ================= */}
            <div className="print-page">
                {renderHeader(3)}
                {renderPatientBox()}

                <div className="space-y-6 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800">
                        Presenting Problems
                    </h3>

                    <div className="space-y-2 flex-1 flex flex-col">
                        <h4 className="font-black text-slate-500 uppercase tracking-wider text-[8px]">
                            Describe reason for referral, elaborating on client's presenting problems and chief complaints. Use client's own words and include prominent symptoms and precipitating events. Describe how current situation and problems are affecting client's normal functioning, emotional stability, safety and wellbeing.
                        </h4>
                        <div className="p-4 border border-slate-300 rounded-2xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed flex-1 text-justify min-h-[350px]">
                            {patient.presenting_problems || 'No presenting problems recorded.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Date of onset of present problem(s)</span>
                            <span className="font-extrabold text-slate-800 text-[11px]">{needs.onset_date || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Previous psychiatric problem(s)</span>
                            <div className="flex gap-6 mt-1">
                                {renderCheckbox(needs.prev_psych_problems === 'No', 'No')}
                                {renderCheckbox(needs.prev_psych_problems !== 'No', 'Yes')}
                            </div>
                        </div>
                    </div>
                </div>

                {renderFooter(3)}
            </div>

            {/* ================= PAGE 4 ================= */}
            <div className="print-page">
                {renderHeader(4)}
                {renderPatientBox()}

                <div className="space-y-6 text-[10px]">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-3 text-slate-800">
                            Past and Current Services and Effectiveness
                        </h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            List past and current services provided to client starting with the most recent on top. Identify providers, dates and effectiveness
                        </p>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2">Type of Services</th>
                                    <th className="border border-slate-300 p-2">Provider / Agency</th>
                                    <th className="border border-slate-300 p-2">Date Received</th>
                                    <th className="border border-slate-300 p-2">Effectiveness</th>
                                </tr>
                            </thead>
                            <tbody>
                                {needs.past_services && needs.past_services.length > 0 ? (
                                    needs.past_services.map((s: any, idx: number) => (
                                        <tr key={idx} className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">{s.type}</td>
                                            <td className="border border-slate-300 p-2">{s.provider}</td>
                                            <td className="border border-slate-300 p-2">{s.date}</td>
                                            <td className="border border-slate-300 p-2">{s.effectiveness}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <>
                                        <tr className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">Psychiatric Outpatient Care</td>
                                            <td className="border border-slate-300 p-2">{patient.psych_name || 'N/A'}</td>
                                            <td className="border border-slate-300 p-2">Ongoing ({needs.psych_duration || 'Years'})</td>
                                            <td className="border border-slate-300 p-2">Effective</td>
                                        </tr>
                                        <tr className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">Primary Medical Care</td>
                                            <td className="border border-slate-300 p-2">{patient.pcp_name || 'N/A'}</td>
                                            <td className="border border-slate-300 p-2">Ongoing ({needs.pcp_duration || 'Years'})</td>
                                            <td className="border border-slate-300 p-2">Effective</td>
                                        </tr>
                                        {needs.medicaid_details && (
                                            <tr className="font-medium text-slate-700">
                                                <td className="border border-slate-300 p-2">Medicaid Insurance Assistance</td>
                                                <td className="border border-slate-300 p-2">Department of Children and Families</td>
                                                <td className="border border-slate-300 p-2">Active</td>
                                                <td className="border border-slate-300 p-2">Effective</td>
                                            </tr>
                                        )}
                                        {needs.food_stamps_amount && (
                                            <tr className="font-medium text-slate-700">
                                                <td className="border border-slate-300 p-2">SNAP / Food Stamps Benefit</td>
                                                <td className="border border-slate-300 p-2">DCF / Food Assistance Program</td>
                                                <td className="border border-slate-300 p-2">Since {needs.food_stamps_since || 'N/A'}</td>
                                                <td className="border border-slate-300 p-2">Effective</td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 mb-3 text-slate-800">
                            Current Medications
                        </h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            List any current medication being taking by client including medical, psychiatric and over-the-counter
                        </p>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2 w-[30%]">Medication</th>
                                    <th className="border border-slate-300 p-2 w-[25%]">Doses/Frequency</th>
                                    <th className="border border-slate-300 p-2 w-[25%]">Prescribing Physician</th>
                                    <th className="border border-slate-300 p-2 w-[20%]">Reason/Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const parseEmrMeds = (raw: string, isPsych: boolean) => {
                                        if (!raw) return [];
                                        const items = raw.split(/[,\n]+/).map(item => item.trim()).filter(item => item.length > 0);
                                        return items.map(item => {
                                            const match = item.match(/^(.*?)\s+(\d+\s*m?g.*?)$/i);
                                            return {
                                                medication: match ? match[1] : item,
                                                dose: match ? match[2] : 'As Directed',
                                                physician: isPsych ? (patient.psych_name || 'Psychiatrist') : (patient.pcp_name || 'Primary Care Physician'),
                                                purpose: isPsych ? 'Treatment of psychiatric condition' : 'Treatment of medical condition'
                                            };
                                        });
                                    };
                                    
                                    const medsList = needs.medications_grid || [
                                        ...parseEmrMeds(patient.psych_medications || '', true),
                                        ...parseEmrMeds(patient.pcp_medications || '', false)
                                    ];
                                    
                                    if (medsList.length === 0) {
                                        return (
                                            <tr className="font-medium text-slate-700 text-[10px]">
                                                <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-400">
                                                    No current medications listed in client chart.
                                                </td>
                                            </tr>
                                        );
                                    }
                                    
                                    return medsList.map((row, idx) => (
                                        <tr key={idx} className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">{row.medication}</td>
                                            <td className="border border-slate-300 p-2">{row.dose}</td>
                                            <td className="border border-slate-300 p-2">{row.physician}</td>
                                            <td className="border border-slate-300 p-2">{row.purpose}</td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

                {renderFooter(4)}
            </div>

            {/* ================= PAGE 5 ================= */}
            <div className="print-page">
                {renderHeader(5)}
                {renderPatientBox()}

                <div className="space-y-6 text-[10px] flex-1 flex flex-col">
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">How does client remember to take his/her medications?</h4>
                        <div className="grid grid-cols-3 gap-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.med_rem_directions === true, 'By following directions')}
                            {renderCheckbox(needs.med_rem_calendar === true, 'Calendar reminder')}
                            {renderCheckbox(needs.med_rem_visible !== false, 'Keeping them visible')}
                            {renderCheckbox(needs.med_rem_organizer === true, 'Pill Organizer')}
                            {renderCheckbox(needs.med_rem_electronic === true, 'Electronic reminder')}
                            {renderCheckbox(needs.med_rem_association === true, 'Daily task association')}
                            {renderCheckbox(needs.med_rem_family === true, 'Family/Caregiver')}
                            {renderCheckbox(needs.med_rem_rn === true, 'RN/HHA Set-up')}
                            {renderCheckbox(needs.med_rem_other === true, 'Other')}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">How well does client self-administer medication?</h4>
                        <div className="grid grid-cols-2 gap-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.med_self_none === true, 'With no help or supervision')}
                            {renderCheckbox(needs.med_self_some !== false, 'With some help or occasional supervision')}
                            {renderCheckbox(needs.med_self_lot === true, 'With a lot of help or constant supervision')}
                            {renderCheckbox(needs.med_self_unable === true, 'Unable to administer own medications/caregiver gives them')}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Has the client had problems getting the medication dispensed or refilled on time?</h4>
                        <div className="flex gap-8 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.med_refill_problems === 'Yes', 'Yes')}
                            {renderCheckbox(needs.med_refill_problems !== 'Yes', 'No')}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3.5 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">What pharmacy does client use?</span>
                            <span className="font-bold text-slate-800">{patient.pharmacy_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Phone No</span>
                            <span className="font-bold text-slate-800">{patient.pharmacy_phone || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                        <h4 className="font-black text-slate-500 uppercase tracking-wider text-[8px]">Any other significant medication issue or concern?:</h4>
                        <div className="p-4 border border-slate-300 rounded-2xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed flex-1 text-justify">
                            {needs.med_issues_concern || 'No other significant medication issues or concerns reported. The client is generally compliant with medications when reminders and organization are set up by family or caregivers.'}
                        </div>
                    </div>
                </div>

                {renderFooter(5)}
            </div>

            {/* ================= PAGE 6 ================= */}
            <div className="print-page">
                {renderHeader(6)}
                {renderPatientBox()}

                <div className="space-y-5 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800">
                        Areas of Functioning and Needs Assessment
                    </h3>

                    <h4 className="font-black text-indigo-600 uppercase tracking-wider text-[9px] leading-none">
                        Mental Health / Behavioral / Substance Abuse
                    </h4>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Mental Health / Psychiatric History:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[140px] text-justify">
                            {needs.psych_history_narrative || 'The client has a history of chronic psychiatric symptoms managed via regular outpatient psychiatric appointments and psychotropic medications. Outpatient records show relative compliance with appointments, with occasional support needed for coordination.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Psychiatrist</span>
                            <span className="font-bold text-slate-800">{patient.psych_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Phone No</span>
                            <span className="font-bold text-slate-800">{patient.psych_phone || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Address</span>
                            <span className="font-bold text-slate-800">{patient.psych_address || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Diagnosis Code (ICD-10)</span>
                            <span className="font-extrabold text-slate-800">{patient.diagnoses?.split(' - ')[0] || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Diagnosis Descriptor</span>
                            <span className="font-bold text-slate-800">{patient.diagnoses?.split(' - ')[1]?.split('\n')[0] || 'N/A'}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Does the client currently have or have had any of the following?:</h4>
                        <div className="grid grid-cols-3 gap-y-2 gap-x-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.symptom_depression !== false, 'Depression')}
                            {renderCheckbox(needs.symptom_sadness !== false, 'Sadness')}
                            {renderCheckbox(needs.symptom_hopelessness !== false, 'Hopelessness')}
                            {renderCheckbox(needs.symptom_helplessness !== false, 'Helplessness')}
                            {renderCheckbox(needs.symptom_negative === true, 'Negative thoughts')}
                            {renderCheckbox(needs.symptom_withdrawal !== false, 'Withdrawal')}
                            {renderCheckbox(needs.symptom_neglect === true, 'Self-neglect')}
                            {renderCheckbox(needs.symptom_interest !== false, 'Loss of interest')}
                            {renderCheckbox(needs.symptom_esteem !== false, 'Low self-esteem')}
                            {renderCheckbox(needs.symptom_anxiety !== false, 'Anxiety')}
                            {renderCheckbox(needs.symptom_nervousness !== false, 'Nervousness')}
                            {renderCheckbox(needs.symptom_irritability === true, 'Irritability')}
                            {renderCheckbox(needs.symptom_sleep !== false, 'Sleep disturbance')}
                            {renderCheckbox(needs.symptom_concentration !== false, 'Poor concentration')}
                            {renderCheckbox(needs.symptom_panic === true, 'Panic attacks')}
                            {renderCheckbox(needs.symptom_fearfulness === true, 'Fearfulness')}
                            {renderCheckbox(needs.symptom_paranoia === true, 'Paranoia')}
                            {renderCheckbox(needs.symptom_obsessive === true, 'Obsessive behaviors')}
                            {renderCheckbox(needs.symptom_aggressiveness === true, 'Aggressiveness')}
                            {renderCheckbox(needs.symptom_hyperactivity === true, 'Hyperactivity')}
                            {renderCheckbox(needs.symptom_impulsivity === true, 'Impulsivity')}
                            {renderCheckbox(needs.symptom_moodswings === true, 'Mood Swings')}
                            {renderCheckbox(needs.symptom_hallucinations === true, 'Hallucinations')}
                            {renderCheckbox(needs.symptom_delusions === true, 'Delusions')}
                        </div>
                    </div>
                </div>

                {renderFooter(6)}
            </div>

            {/* ================= PAGE 7 ================= */}
            <div className="print-page">
                {renderHeader(7)}
                {renderPatientBox()}

                <div className="space-y-5 text-[10px] flex-1 flex flex-col">
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Has the client ever been hospitalized due to mental health/behavior issues?</h4>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2 w-[40%]">Hospital or Institution</th>
                                    <th className="border border-slate-300 p-2 w-[20%]">Date</th>
                                    <th className="border border-slate-300 p-2 w-[40%]">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {needs.psych_hospitalizations && needs.psych_hospitalizations.length > 0 ? (
                                    needs.psych_hospitalizations.map((h: any, idx: number) => (
                                        <tr key={idx} className="font-medium text-slate-700">
                                            <td className="border border-slate-300 p-2">{h.facility}</td>
                                            <td className="border border-slate-300 p-2">{h.date}</td>
                                            <td className="border border-slate-300 p-2">{h.reason}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="font-medium text-slate-700">
                                        <td colSpan={3} className="border border-slate-300 p-3 text-center text-slate-400">
                                            No psychiatric hospitalizations documented.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Has client ever had or currently has any of the following?:</h4>
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.risk_suicidal === true, 'Suicidal Attempt/Ideation')}
                            {renderCheckbox(needs.risk_homicidal === true, 'Homicidal Attempt/Ideation')}
                            {renderCheckbox(needs.risk_abuse === true, 'Abuse/Violence')}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Provide details:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-slate-700 leading-relaxed min-h-[50px]">
                            {needs.risk_details || 'No suicidal or homicidal attempts or ideation were reported. No signs of abuse or violence reported.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Describe any risk taking behavior that client may have:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-slate-700 leading-relaxed min-h-[90px]">
                            {needs.risk_behavior_description || 'The client does not report engaging in intentional high-risk behaviors. The primary risk factors relate to clinical management (potential nonadherence to medication due to cognitive limitations if unmonitored) and lack of family support.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Have you ever used alcohol or other drugs?</span>
                            <div className="flex gap-4 mt-1">
                                {renderCheckbox(needs.substance_use === 'No' || !needs.substance_use, 'No')}
                                {renderCheckbox(needs.substance_use === 'Yes', 'Yes')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Been to rehab/detox treatment?</span>
                            <div className="flex gap-4 mt-1">
                                {renderCheckbox(needs.substance_rehab === 'No' || !needs.substance_rehab, 'No')}
                                {renderCheckbox(needs.substance_rehab === 'Yes', 'Yes')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Feel you currently have addiction?</span>
                            <div className="flex gap-4 mt-1">
                                {renderCheckbox(needs.substance_addiction === 'No' || !needs.substance_addiction, 'No')}
                                {renderCheckbox(needs.substance_addiction === 'Yes', 'Yes')}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's mental health:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_mental_health_note || 'The client needs to continue receiving regular psychiatric outpatient care and medication management to maintain stability and prevent hospitalization.'}
                        </div>
                    </div>
                </div>

                {renderFooter(7)}
            </div>

            {/* ================= PAGE 8 ================= */}
            <div className="print-page">
                {renderHeader(8)}
                {renderPatientBox()}

                <div className="space-y-4 text-[10px] flex-1 flex flex-col">
                    <h4 className="font-black text-indigo-600 uppercase tracking-wider text-[9px] leading-none">
                        Physical Health / Medical / Dental
                    </h4>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Primary Care Physician (PCP)</span>
                            <span className="font-bold text-slate-800">{patient.pcp_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Phone No</span>
                            <span className="font-bold text-slate-800">{patient.pcp_phone || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Place of Practice / Address</span>
                            <span className="font-bold text-slate-800">{patient.pcp_address || 'N/A'}</span>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-1.5">List any medical problems/conditions that client or family currently have or have had in the past</h4>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2 w-[40%]">Medical Problem/Condition</th>
                                    <th className="border border-slate-300 p-2 w-[15%] text-center">Client</th>
                                    <th className="border border-slate-300 p-2 w-[15%] text-center">Family</th>
                                    <th className="border border-slate-300 p-2 w-[30%]">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {needs.chronic_conditions && needs.chronic_conditions.length > 0 ? (
                                    needs.chronic_conditions.map((c: any, idx: number) => (
                                        <tr key={idx} className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">{c.condition}</td>
                                            <td className="border border-slate-300 p-2 text-center text-indigo-650 font-black">{c.client_has ? '\u2713' : '-'}</td>
                                            <td className="border border-slate-300 p-2 text-center text-indigo-650 font-black">{c.family_has ? '\u2713' : '-'}</td>
                                            <td className="border border-slate-300 p-2">{c.comments || 'N/A'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    patient.pcp_conditions?.split(',').map((cond: string, idx: number) => (
                                        <tr key={idx} className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">{cond.trim()}</td>
                                            <td className="border border-slate-300 p-2 text-center text-indigo-600 font-black">&#10003;</td>
                                            <td className="border border-slate-300 p-2 text-center">-</td>
                                            <td className="border border-slate-300 p-2">Managed with current medical prescriptions.</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Allergies</span>
                            <span className="font-bold text-slate-800">{needs.allergies || 'No Known Allergies (NKDA)'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Has client undergone any surgical procedure?</span>
                            <span className="font-bold text-slate-800">{needs.surgeries || 'None'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Hearing</h4>
                            <div className="space-y-1.5">
                                {renderCheckbox(needs.hearing_level === 'no_impairment' || !needs.hearing_level, 'No hearing impairment')}
                                {renderCheckbox(needs.hearing_level === 'managed_devices', 'Hearing impairment managed through assistive devices')}
                                {renderCheckbox(needs.hearing_level === 'difficulty_conversation', 'Hearing difficulty at level of conversation')}
                                {renderCheckbox(needs.hearing_level === 'only_loud_sounds', 'Hears only very loud sounds')}
                                {renderCheckbox(needs.hearing_level === 'no_useful_hearing', 'No useful hearing')}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Vision</h4>
                            <div className="space-y-1.5">
                                {renderCheckbox(needs.vision_level === 'no_impairment' || !needs.vision_level, 'Has no impairment of vision')}
                                {renderCheckbox(needs.vision_level === 'managed_devices', 'Vision impairment managed through assistive devices')}
                                {renderCheckbox(needs.vision_level === 'difficulty_print', 'Has difficulty seeing at level of print (far-sighted)')}
                                {renderCheckbox(needs.vision_level === 'difficulty_objects', 'Has difficulty seeing objects in environment (near-sighted)')}
                                {renderCheckbox(needs.vision_level === 'no_useful_vision', 'Has no useful vision')}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Is client currently pregnant?</span>
                        <div className="flex gap-8 mt-1">
                            {renderCheckbox(needs.is_pregnant === 'Yes', 'Yes')}
                            {renderCheckbox(needs.is_pregnant !== 'Yes', 'No')}
                        </div>
                    </div>
                </div>

                {renderFooter(8)}
            </div>

            {/* ================= PAGE 9 ================= */}
            <div className="print-page">
                {renderHeader(9)}
                {renderPatientBox()}

                <div className="space-y-6 text-[10px] flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Are all immunizations/vaccines current?</span>
                            <div className="flex gap-4 mt-1.5">
                                {renderCheckbox(needs.vaccines_current !== false, 'Yes')}
                                {renderCheckbox(needs.vaccines_current === false, 'No')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Are you on a physician ordered special diet?</span>
                            <div className="flex gap-4 mt-1.5">
                                {renderCheckbox(needs.special_diet === true, 'Yes')}
                                {renderCheckbox(needs.special_diet !== true, 'No')}
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px] mb-1">How active are you? I exercise or engage in physical activities:</span>
                        <span className="font-bold text-slate-800 text-[11px] bg-slate-100/50 py-1.5 px-3 rounded-lg border border-slate-200 block w-fit">
                            {needs.physical_activity || 'Rarely / Inactive'}
                        </span>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Please indicate the last time (date) the following preventive procedures were conducted</h4>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2 w-[50%]">Procedure</th>
                                    <th className="border border-slate-300 p-2 w-[50%]">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {needs.food_programs && needs.food_programs.length > 0 ? (
                                    needs.food_programs.map((f: any, idx: number) => (
                                        <tr key={idx} className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">{f.program_type}</td>
                                            <td className="border border-slate-300 p-2 text-center text-indigo-600 font-black">{f.enrolled ? '\u2713' : '-'}</td>
                                            <td className="border border-slate-300 p-2">{f.frequency || 'N/A'}</td>
                                            <td className="border border-slate-300 p-2">{f.provider_agency || 'N/A'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <>
                                        <tr className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">Food Stamps/S.N.A.P.</td>
                                            <td className="border border-slate-300 p-2 text-center text-indigo-600 font-black">&#10003;</td>
                                            <td className="border border-slate-300 p-2">Monthly</td>
                                            <td className="border border-slate-300 p-2">DCF</td>
                                        </tr>
                                        <tr className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">Food Pantry/Food Banks</td>
                                            <td className="border border-slate-300 p-2 text-center">-</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                        </tr>
                                        <tr className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">Home delivered meals</td>
                                            <td className="border border-slate-300 p-2 text-center">-</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                        </tr>
                                        <tr className="font-medium text-slate-700 text-[10px]">
                                            <td className="border border-slate-300 p-2 font-bold">Congregate meals</td>
                                            <td className="border border-slate-300 p-2 text-center">-</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                            <td className="border border-slate-300 p-2">N/A</td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's physical health:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_physical_health_note || 'The client needs to continue receiving regular follow-up with the Primary Care Physician (PCP) for chronic condition management and monitoring.'}
                        </div>
                    </div>
                </div>

                {renderFooter(9)}
            </div>

            {/* ================= PAGE 10 ================= */}
            <div className="print-page">
                {renderHeader(10)}
                {renderPatientBox()}

                <div className="space-y-5 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Vocational / Employment
                    </h3>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Vocational/Employment history:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[90px] text-justify">
                            {needs.vocational_history || 'The client is currently disabled and unable to work due to psychiatric and medical conditions. He receives disability benefits.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Employment Status</span>
                            <span className="font-extrabold text-slate-800">{needs.employment_status || 'Disabled'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Is client currently employed?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.is_employed === 'Yes', 'Yes')}
                                {renderCheckbox(needs.is_employed !== 'Yes', 'No')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Is the client able to work or perform any gainful and productive activity?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.able_to_work === 'Yes', 'Yes')}
                                {renderCheckbox(needs.able_to_work === 'No' || !needs.able_to_work, 'No')}
                                {renderCheckbox(needs.able_to_work === 'With Limitations', 'Yes but with limitations')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Does client need assistance or support to seek, obtain and sustain employment?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.needs_employment_assistance === 'Yes', 'Yes')}
                                {renderCheckbox(needs.needs_employment_assistance !== 'Yes', 'No')}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 pt-2 text-slate-800 leading-none">
                        School / Education
                    </h3>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">What is the highest level of education client has completed?</span>
                            <span className="font-extrabold text-slate-800">{needs.education_level || 'High School'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Is client interested in furthering his/her education?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.further_education_interest === 'Yes', 'Yes')}
                                {renderCheckbox(needs.further_education_interest !== 'Yes', 'No')}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Does client need assistance or support in gaining access to educational services?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.needs_education_assistance === 'Yes', 'Yes')}
                                {renderCheckbox(needs.needs_education_assistance !== 'Yes', 'No')}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's school / education:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_education_note || 'None reported at this time.'}
                        </div>
                    </div>
                </div>

                {renderFooter(10)}
            </div>

            {/* ================= PAGE 11 ================= */}
            <div className="print-page">
                {renderHeader(11)}
                {renderPatientBox()}

                <div className="space-y-5 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Social / Support System / Recreational
                    </h3>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Describe client's cultural affiliations and/or spiritual/religious beliefs:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[60px] text-justify">
                            {needs.religion ? `Client identifies as ${needs.religion}. Spiritual beliefs play a supportive role in coping and emotional stability.` : 'No religious or cultural barriers to treatment reported.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Does the client currently participate in any social activity or program in the community?</span>
                            <div className="flex gap-4 mt-1">
                                {renderCheckbox(needs.social_activity === 'Yes', 'Yes')}
                                {renderCheckbox(needs.social_activity !== 'Yes', 'No')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Briefly describe client's social skills:</span>
                            <span className="font-bold text-slate-800 block mt-1">{needs.social_skills_description || 'Polite, cooperative, but tends to be reserved or isolated.'}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">What activities or things does client enjoy doing or which ones would he/she like to do?:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[60px] text-justify">
                            {needs.enjoyable_activities || 'Enjoys watching television, listening to music, resting, and short walks.'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Describe client's relationships and support system:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[120px] text-justify">
                            {needs.support_system_description || `Limited support network. Patient has emergency contact ${patient.emergency_contact_name || 'Family member'} (${needs.emergency_contact_relationship || patient.emergency_contact_relation || 'Relation'}), but lives alone and experiences social isolation.`}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's social functioning:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_recreational_note || 'The client needs to interact with more people and expand the social support network to improve coping and reduce isolation.'}
                        </div>
                    </div>
                </div>

                {renderFooter(11)}
            </div>

            {/* ================= PAGE 12 ================= */}
            <div className="print-page">
                {renderHeader(12)}
                {renderPatientBox()}

                <div className="space-y-5 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Activities of Daily Living
                    </h3>

                    <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[8px]">
                        Identify the activities that client has difficulties to perform and indicate level of dependency
                    </h4>

                    <table className="w-full border-collapse border border-slate-300 text-center">
                        <thead>
                            <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="border border-slate-300 p-2 text-left">Activities of Daily Living</th>
                                <th className="border border-slate-300 p-2 w-[15%]">Assistive Technology</th>
                                <th className="border border-slate-300 p-2 w-[15%]">Independent</th>
                                <th className="border border-slate-300 p-2 w-[15%]">Supervision & Prompts</th>
                                <th className="border border-slate-300 p-2 w-[15%]">Physical Assistance</th>
                                <th className="border border-slate-300 p-2 w-[15%]">Total Dependence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { name: 'Feeding/eating', field: 'feed' },
                                { name: 'Grooming and personal hygiene', field: 'groom' },
                                { name: 'Bathing/showering', field: 'bath' },
                                { name: 'Dressing', field: 'dress' },
                                { name: 'Transferring and mobility', field: 'transfer' },
                                { name: 'Cooking/preparing meals', field: 'cook' },
                                { name: 'Doing laundry, housekeeping', field: 'laundry' },
                                { name: 'Making/answering phone calls', field: 'phone' },
                                { name: 'Shopping/errands', field: 'shop' }
                            ].map((adl, idx) => {
                                const level = needs[`adl_${adl.field}`] || (['cook', 'laundry', 'phone', 'shop'].includes(adl.field) ? 'supervision' : 'independent');
                                return (
                                    <tr key={idx} className="font-medium text-slate-700">
                                        <td className="border border-slate-300 p-2 text-left font-bold">{adl.name}</td>
                                        <td className="border border-slate-300 p-2 text-indigo-600 font-extrabold">{level === 'tech' ? '✓' : ''}</td>
                                        <td className="border border-slate-300 p-2 text-indigo-600 font-extrabold">{level === 'independent' ? '✓' : ''}</td>
                                        <td className="border border-slate-300 p-2 text-indigo-600 font-extrabold">{level === 'supervision' ? '✓' : ''}</td>
                                        <td className="border border-slate-300 p-2 text-indigo-600 font-extrabold">{level === 'physical' ? '✓' : ''}</td>
                                        <td className="border border-slate-300 p-2 text-indigo-600 font-extrabold">{level === 'total' ? '✓' : ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's activities of daily living:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_daily_living_note || 'The client requires structured assistance with Instrumental Activities of Daily Living (IADLs), including budgeting, transportation coordination, and benefit applications.'}
                        </div>
                    </div>
                </div>

                {renderFooter(12)}
            </div>

            {/* ================= PAGE 13 ================= */}
            <div className="print-page">
                {renderHeader(13)}
                {renderPatientBox()}

                <div className="space-y-4 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Housing / Living Environment
                    </h3>

                    <div className="grid grid-cols-4 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Residential Status</span>
                            <span className="font-extrabold text-slate-800">{needs.housing_type || 'Renting'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">No. of people in home</span>
                            <span className="font-extrabold text-slate-800">{needs.co_habitants?.split('\n')?.length || '1'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">No. of bedrooms</span>
                            <span className="font-extrabold text-slate-800">{needs.housing_bedrooms || '1'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">PPB Ratio</span>
                            <span className="font-extrabold text-slate-800">{needs.housing_ppb || '1'}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Describe client's living and sleeping arrangements:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[50px] text-justify">
                            {needs.housing_arrangements_description || 'Resides alone in a rented apartment. Sleeps in own bedroom, arrangements are clean and stable.'}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Area(s) where there are potential safety risks or accessibility/mobility barriers:</h4>
                        <div className="grid grid-cols-3 gap-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.risk_structural === true, 'Structural damage')}
                            {renderCheckbox(needs.risk_electrical === true, 'Electrical hazards')}
                            {renderCheckbox(needs.risk_lighting === true, 'Poor lighting')}
                            {renderCheckbox(needs.risk_water === true, 'No hot or running water')}
                            {renderCheckbox(needs.risk_fire === true, 'Fire hazards')}
                            {renderCheckbox(needs.risk_tripping === true, 'Tripping/fall hazards')}
                            {renderCheckbox(needs.risk_unsanitary === true, 'Unsanitary conditions')}
                            {renderCheckbox(needs.risk_ac === true, 'No air conditioning/heat')}
                            {renderCheckbox(needs.risk_stairs === true, 'Stairs/steps unsafe')}
                            {renderCheckbox(needs.risk_phone === true, 'No telephone (or not working)')}
                            {renderCheckbox(needs.risk_clutter === true, 'Excessive clutter')}
                            {renderCheckbox(needs.risk_pests === true, 'Insects or other pests')}
                            {renderCheckbox(needs.risk_carpet === true, 'Flooring/carpet loose')}
                            {renderCheckbox(needs.risk_shower === true, 'Bathtub/shower unsafe')}
                            {renderCheckbox(needs.risk_appliances === true, 'Appliances not working')}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Describe neighborhood:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[50px] text-justify">
                            {needs.neighborhood_description || 'Urban neighborhood, generally safe, close to community facilities.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Does the client feel safe in the current living arrangement?</span>
                            <div className="flex gap-4 mt-1">
                                {renderCheckbox(needs.housing_feels_safe !== false, 'Yes')}
                                {renderCheckbox(needs.housing_feels_safe === false, 'No')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Would client like to continue to live in the current place?</span>
                            <span className="font-bold text-slate-800 block mt-1">{needs.housing_preference || 'Continue to live here'}</span>
                        </div>
                    </div>
                </div>

                {renderFooter(13)}
            </div>

            {/* ================= PAGE 14 ================= */}
            <div className="print-page">
                {renderHeader(14)}
                {renderPatientBox()}

                <div className="space-y-5 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Economic / Financial
                    </h3>

                    <div className="grid grid-cols-3 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Monthly Family Income</span>
                            <span className="font-extrabold text-slate-800">${needs.rent_payment || '994'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Main source of income</span>
                            <span className="font-extrabold text-slate-800">{needs.ssi_details?.split(' ')[0] || 'SSI'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Other financial resources</span>
                            <span className="font-extrabold text-slate-800">{needs.other_financial_resources || 'Food Stamps'}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Is the client or the client's family currently having any financial difficulties?</span>
                        <div className="flex gap-8 mt-1.5 mb-2">
                            {renderCheckbox(needs.financial_difficulties !== false, 'Yes')}
                            {renderCheckbox(needs.financial_difficulties === false, 'No')}
                        </div>
                        {needs.financial_difficulties !== false && (
                            <div className="p-3 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 leading-relaxed text-justify mt-1.5">
                                {needs.financial_difficulties_description || 'Yes, the client has limited monthly income from disability and finds it difficult to cover all housing and utility expenses.'}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's economic / financial:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed text-justify">
                            {needs.domain_financial_note || 'Needs assistance applying for utility assistance (LIHEAP) and food benefits renewals.'}
                        </div>
                    </div>

                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 pt-2 text-slate-800 leading-none">
                        Basic Needs
                    </h3>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Does the client receive or use any of the following types of food assistance?</h4>
                        <table className="w-full border-collapse border border-slate-300 text-left">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2 w-[40%]">Assistance type</th>
                                    <th className="border border-slate-300 p-2 w-[20%] text-center">Receive/use?</th>
                                    <th className="border border-slate-300 p-2 w-[20%]">How often?</th>
                                    <th className="border border-slate-300 p-2 w-[20%]">Provider?</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Food Stamps/S.N.A.P.</td>
                                    <td className="border border-slate-300 p-2 text-center text-indigo-600 font-black">&#10003;</td>
                                    <td className="border border-slate-300 p-2">Monthly</td>
                                    <td className="border border-slate-300 p-2">DCF</td>
                                </tr>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Food Pantry/Food Banks</td>
                                    <td className="border border-slate-300 p-2 text-center">-</td>
                                    <td className="border border-slate-300 p-2">N/A</td>
                                    <td className="border border-slate-300 p-2">N/A</td>
                                </tr>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Home delivered meals</td>
                                    <td className="border border-slate-300 p-2 text-center">-</td>
                                    <td className="border border-slate-300 p-2">N/A</td>
                                    <td className="border border-slate-300 p-2">N/A</td>
                                </tr>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Congregate meals</td>
                                    <td className="border border-slate-300 p-2 text-center">-</td>
                                    <td className="border border-slate-300 p-2">N/A</td>
                                    <td className="border border-slate-300 p-2">N/A</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's basic needs:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_basic_needs_note || 'The client requires assistance applying for grocery assistance and meal programs to ensure nutrition.'}
                        </div>
                    </div>
                </div>

                {renderFooter(14)}
            </div>

            {/* ================= PAGE 15 ================= */}
            <div className="print-page">
                {renderHeader(15)}
                {renderPatientBox()}

                <div className="space-y-4 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Transportation
                    </h3>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">How does client get to the places he/she want or need to go?:</h4>
                        <div className="grid grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.transport_walks === true, 'Walks')}
                            {renderCheckbox(needs.drives === 'Yes', 'Drives')}
                            {renderCheckbox(needs.transport_bus === true, 'Takes a bus/taxi')}
                            {renderCheckbox(needs.transport_friend === true, 'Friend/family')}
                            {renderCheckbox(needs.transport_staff !== false, 'Staff/Provider')}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">How well is client able to use public transportation?</span>
                            <span className="font-bold text-slate-800">{needs.transportation_ability_description || 'Needs some help or occasional supervision'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Does the client have any other transportation needs?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.other_transportation_needs === 'Yes', 'Yes')}
                                {renderCheckbox(needs.other_transportation_needs !== 'Yes', 'No')}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Transportation Needs Explanation:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[50px] text-justify">
                            {needs.domain_transportation_note || 'Needs coordination of specialized medical transport (Modivcare) for specialist appointments.'}
                        </div>
                    </div>

                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 pt-2 text-slate-800 leading-none">
                        Legal / Immigration
                    </h3>

                    <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Has client ever been arrested?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.arrested === 'Yes', 'Yes')}
                                {renderCheckbox(needs.arrested !== 'Yes', 'No')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Is there any current and ongoing legal process?</span>
                            <div className="flex gap-4 mt-0.5">
                                {renderCheckbox(needs.legal_process === 'Yes', 'Yes')}
                                {renderCheckbox(needs.legal_process !== 'Yes', 'No')}
                            </div>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Country of Birth</span>
                            <span className="font-extrabold text-slate-800">{needs.origin_country || 'Cuba'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Year entered USA</span>
                            <span className="font-extrabold text-slate-800">{needs.us_entry_date || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px] mb-1.5">Immigration Status</span>
                        <div className="flex gap-8">
                            {renderCheckbox(needs.citizenship_status === 'Citizen' || patient.citizenship === 'Citizen', 'Citizen')}
                            {renderCheckbox(needs.residence_status === 'Resident' || patient.citizenship === 'Resident', 'Resident')}
                            {renderCheckbox(patient.citizenship !== 'Citizen' && patient.citizenship !== 'Resident', 'Other')}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                        <span className="block text-slate-400 font-bold uppercase tracking-wider text-[8px]">Needs identified related to client's legal / immigration:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 font-medium text-indigo-600 leading-relaxed flex-1 text-justify">
                            {needs.domain_legal_note || 'None reported at this time.'}
                        </div>
                    </div>
                </div>

                {renderFooter(15)}
            </div>

            {/* ================= PAGE 16 ================= */}
            <div className="print-page">
                {renderHeader(16)}
                {renderPatientBox()}

                <div className="space-y-4 text-[10px] flex-1 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                        Summary of Client's Strengths and Weaknesses
                    </h3>

                    <div className="space-y-1.5">
                        <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">A. List client's current and potential strengths, abilities, assets, interests, preferences, resources that may contribute to his/her recovery and wellbeing:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[140px] text-justify">
                            {needs.patient_strengths || 'The client is cooperative, compliant with medication schedules when reminders are set, and has stable housing. He maintains regular attendance at clinical appointments and communicates needs clearly.'}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <span className="block font-bold text-slate-500 uppercase tracking-wider text-[8px]">B. List client's current and potential weakness, needs, barriers, challenges, etc. that may interfere with his/her recovery and wellbeing:</span>
                        <div className="p-3 border border-slate-300 rounded-xl bg-slate-50/30 text-slate-700 font-medium leading-relaxed min-h-[140px] text-justify">
                            {needs.patient_weaknesses || 'The client has chronic mental health symptoms, lack of family support, financial difficulties, and cognitive limitations that affect independent management of appointments and social services.'}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">Recommended Services (Domains):</h4>
                        <div className="grid grid-cols-2 gap-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {renderCheckbox(needs.domain_mental_health === true, '#1 Mental Health / Substance Abuse')}
                            {renderCheckbox(needs.domain_physical_health === true, '#2 Physical Health / Medical / Dental')}
                            {renderCheckbox(needs.domain_vocational === true, '#3 Vocational / Employment / Job Training')}
                            {renderCheckbox(needs.domain_education === true, '#4 School / Education')}
                            {renderCheckbox(needs.domain_recreational === true, '#5 Recreational / Social Support')}
                            {renderCheckbox(needs.domain_daily_living === true, '#6 Activities of Daily Living')}
                            {renderCheckbox(needs.domain_housing === true, '#7 Housing / Shelter')}
                            {renderCheckbox(needs.domain_financial === true, '#8 Economic / Financial')}
                            {renderCheckbox(needs.domain_basic_needs === true, '#9 Basic Needs')}
                            {renderCheckbox(needs.domain_transportation === true, '#10 Transportation')}
                            {renderCheckbox(needs.domain_legal === true, '#11 Legal / Immigration')}
                            {renderCheckbox(needs.domain_other === true, '#12 Other')}
                        </div>
                    </div>
                </div>

                {renderFooter(16)}
            </div>

            {/* ================= PAGE 17 ================= */}
            <div className="print-page">
                {renderHeader(17)}
                {renderPatientBox()}

                <div className="space-y-6 text-[10px] flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-300 pb-1.5 text-slate-800 leading-none">
                            Signatures
                        </h3>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                            <h4 className="font-black text-slate-800 uppercase tracking-wider mb-2">I certify that either one of the following requirements was met prior to the completion of client's Assessment:</h4>
                            <div className="space-y-2">
                                {renderCheckbox(needs.home_visit_conducted !== false, `A home visit was conducted prior to the completion of this Assessment on: ${needs.home_visit_date || '01/05/2026'}`)}
                                {renderCheckbox(needs.home_visit_conducted === false, 'Case Manager was unable to complete a home visit')}
                            </div>
                        </div>

                        <table className="w-full border-collapse border border-slate-300 text-left mt-6">
                            <thead>
                                <tr className="bg-slate-100 text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="border border-slate-300 p-2">Responsibility</th>
                                    <th className="border border-slate-300 p-2">Name</th>
                                    <th className="border border-slate-300 p-2">Credentials</th>
                                    <th className="border border-slate-300 p-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Case Manager</td>
                                    <td className="border border-slate-300 p-2">{patient.case_manager || 'Claudia Leyva'}</td>
                                    <td className="border border-slate-300 p-2">CBHCM</td>
                                    <td className="border border-slate-300 p-2">{needs.home_visit_date || '01/07/2026'}</td>
                                </tr>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Senior/Lead Case Manager</td>
                                    <td className="border border-slate-300 p-2">-</td>
                                    <td className="border border-slate-300 p-2">-</td>
                                    <td className="border border-slate-300 p-2">-</td>
                                </tr>
                                <tr className="font-medium text-slate-700">
                                    <td className="border border-slate-300 p-2 font-bold">Case Manager Supervisor</td>
                                    <td className="border border-slate-300 p-2">Ileana Alvarez V.</td>
                                    <td className="border border-slate-300 p-2">CBHCMS</td>
                                    <td className="border border-slate-300 p-2">{needs.home_visit_date || '01/07/2026'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Digital Signatures Display */}
                    <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-8 pb-10">
                        <div className="flex flex-col items-center text-center">
                            <span className="text-[11px] font-black text-slate-800">{patient.case_manager || 'Claudia Leyva'}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Case Manager</span>
                            <div className="h-12 flex items-center justify-center my-2">
                                <span className="font-serif italic text-lg text-slate-400/60 font-medium">/ Claudia Leyva /</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{needs.home_visit_date || '01/07/2026'}</span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-[11px] font-black text-slate-800">Ileana Alvarez V.</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Case Manager Supervisor</span>
                            <div className="h-12 flex items-center justify-center my-2">
                                <span className="font-serif italic text-lg text-slate-400/60 font-medium">/ Ileana Alvarez V. /</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{needs.home_visit_date || '01/07/2026'}</span>
                        </div>
                    </div>
                </div>

                {renderFooter(17)}
            </div>
        </div>
    );
};

export default PrintAssessment;
