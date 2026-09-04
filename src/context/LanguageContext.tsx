import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'es';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Dictionary of translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header & Sidebar
    "nav.new_encounter": "New encounter",
    "nav.clinical_history": "Clinical history",
    "nav.history": "History",
    "nav.clients": "Clients",
    "nav.audit_logs": "Audit logs",
    "nav.platform_admin": "Platform Admin",
    "nav.settings": "Settings",
    "nav.logout": "Sign out",
    "nav.dashboard": "Dashboard",
    "nav.templates": "Templates",
    "nav.setup": "Setup",

    // Record Page
    "record.quick_start_guide": "Quick Start Guide",
    "record.steps_instruction": "Complete these simple steps",
    "record.hover_for_details": "(hover steps for details)",
    "record.step.client": "Client",
    "record.step.client_desc": "Select client",
    "record.step.times": "Times",
    "record.step.times_desc": "Set date & times",
    "record.step.service": "Service",
    "record.step.service_desc": "Select service",
    "record.step.capture": "Capture",
    "record.step.capture_desc": "Record or write",
    "record.client_identity": "Client Identity",
    "record.search_patient_placeholder": "Search patient registry...",
    "record.encounter_info": "Encounter Info",
    "record.service_provided": "Service Provided",
    "record.select_encounter_type": "Select encounter type...",
    "record.voice_capture": "Voice Capture",
    "record.system_standby": "System Standby",
    "record.ready_to_record": "Ready to record",
    "record.recording": "Recording...",
    "record.session_finalized": "Session Finalized",
    "record.discard": "Discard",
    "record.encounter_goals": "Encounter Goals",
    "record.goals_placeholder": "Specify symptoms, history focus, or session objectives (optional)...",
    "record.add_service": "Add Service",
    "record.fill_fields_to_enable": "Fill patient & service fields to enable",
    "record.show_guide": "Show Quick Start Guide",
    "record.joint_note_stack": "Joint Note Stack",
    "record.discard_session": "Discard Session",
    "record.finalize_encounter": "Finalize Encounter",
    "record.generating_note": "Analyzing session details...",
    "record.success_add_service": "Service added to the session stack.",
    "record.success_finalize": "Encounter finalized. Analyzing clinical content...",

    // Patients Page
    "patients.title": "Patients Registry",
    "patients.search_placeholder": "Search by name, DOB, or case number...",
    "patients.new_patient": "New Patient",
    "patients.table.name": "Client Name",
    "patients.table.dob": "Date of Birth",
    "patients.table.case_number": "EMR ID / Case #",
    "patients.table.language": "Language",
    "patients.table.created": "Created At",
    "patients.table.actions": "Actions",
    "patients.view_detail": "View Detail",
    "patients.no_patients": "No patients found.",

    // Patient Detail Page
    "patient.detail_title": "Patient Profile",
    "patient.back_to_list": "Back to registry",
    "patient.edit_profile": "Edit Profile",
    "patient.save_changes": "Save Changes",
    "patient.cancel": "Cancel",
    "patient.info_card": "Clinical Identity & Records",
    "patient.label.full_name": "Full Name",
    "patient.label.dob": "Date of Birth",
    "patient.label.case_number": "Case Number",
    "patient.label.language": "Preferred Language",
    "patient.label.phone": "Phone Number",
    "patient.label.email": "Email Address",
    "patient.label.address": "Home Address",
    "patient.label.notes_history": "Encounter History",
    "patient.no_notes": "No clinical notes generated yet.",

    // Settings Page
    "settings.title": "Account & Settings",
    "settings.profile_section": "User Profile Info",
    "settings.label.name": "Full Name",
    "settings.label.email": "Email Address",
    "settings.label.role": "Access Role",
    "settings.label.mfa": "Multi-Factor Authentication",
    "settings.mfa_enabled": "Enabled",
    "settings.mfa_disabled": "Disabled",
    "settings.save_settings": "Save Settings",

    // General / Modals
    "modal.create_patient": "Create New Patient",
    "modal.edit_patient": "Edit Patient Info",
    "modal.first_name": "First Name",
    "modal.last_name": "Last Name",
    "modal.submit": "Submit",
    "modal.close": "Close"
  },
  es: {
    // Header & Sidebar
    "nav.new_encounter": "Nuevo encuentro",
    "nav.clinical_history": "Historial clínico",
    "nav.history": "Historial",
    "nav.clients": "Clientes",
    "nav.audit_logs": "Registros de auditoría",
    "nav.platform_admin": "Admin de Plataforma",
    "nav.settings": "Ajustes",
    "nav.logout": "Cerrar sesión",
    "nav.dashboard": "Panel de control",
    "nav.templates": "Plantillas",
    "nav.setup": "Configuración inicial",

    // Record Page
    "record.quick_start_guide": "Guía de Inicio Rápido",
    "record.steps_instruction": "Completa estos sencillos pasos",
    "record.hover_for_details": "(pasa el cursor para ver detalles)",
    "record.step.client": "Cliente",
    "record.step.client_desc": "Selecciona cliente",
    "record.step.times": "Tiempos",
    "record.step.times_desc": "Fecha y horas",
    "record.step.service": "Servicio",
    "record.step.service_desc": "Elige servicio",
    "record.step.capture": "Captura",
    "record.step.capture_desc": "Graba o escribe",
    "record.client_identity": "Identidad del Cliente",
    "record.search_patient_placeholder": "Buscar paciente en el registro...",
    "record.encounter_info": "Información del Encuentro",
    "record.service_provided": "Servicio Prestado",
    "record.select_encounter_type": "Selecciona tipo de encuentro...",
    "record.voice_capture": "Captura de Voz",
    "record.system_standby": "Sistema en Espera",
    "record.ready_to_record": "Listo para grabar",
    "record.recording": "Grabando...",
    "record.session_finalized": "Sesión Finalizada",
    "record.discard": "Descartar",
    "record.encounter_goals": "Objetivos del Encuentro",
    "record.goals_placeholder": "Especifica síntomas, enfoque del historial u objetivos de la sesión (opcional)...",
    "record.add_service": "Agregar Servicio",
    "record.fill_fields_to_enable": "Completa los campos de paciente y servicio para activar",
    "record.show_guide": "Mostrar Guía de Inicio Rápido",
    "record.joint_note_stack": "Pila de Notas Conjuntas",
    "record.discard_session": "Descartar Sesión",
    "record.finalize_encounter": "Finalizar Encuentro",
    "record.generating_note": "Analizando detalles de la sesión...",
    "record.success_add_service": "Servicio agregado a la pila de la sesión.",
    "record.success_finalize": "Encuentro finalizado. Analizando contenido clínico...",

    // Patients Page
    "patients.title": "Registro de Pacientes",
    "patients.search_placeholder": "Buscar por nombre, fecha de nacimiento o número de caso...",
    "patients.new_patient": "Nuevo Paciente",
    "patients.table.name": "Nombre del Cliente",
    "patients.table.dob": "Fecha de Nacimiento",
    "patients.table.case_number": "EMR ID / Caso",
    "patients.table.language": "Idioma",
    "patients.table.created": "Creado el",
    "patients.table.actions": "Acciones",
    "patients.view_detail": "Ver Detalles",
    "patients.no_patients": "No se encontraron pacientes.",

    // Patient Detail Page
    "patient.detail_title": "Perfil del Paciente",
    "patient.back_to_list": "Volver al registro",
    "patient.edit_profile": "Editar Perfil",
    "patient.save_changes": "Guardar Cambios",
    "patient.cancel": "Cancelar",
    "patient.info_card": "Identidad Clínica e Historial",
    "patient.label.full_name": "Nombre Completo",
    "patient.label.dob": "Fecha de Nacimiento",
    "patient.label.case_number": "Número de Caso",
    "patient.label.language": "Idioma Preferido",
    "patient.label.phone": "Número de Teléfono",
    "patient.label.email": "Dirección de Correo",
    "patient.label.address": "Dirección Particular",
    "patient.label.notes_history": "Historial de Encuentros",
    "patient.no_notes": "Aún no se han generado notas clínicas.",

    // Settings Page
    "settings.title": "Cuenta y Configuración",
    "settings.profile_section": "Información de Perfil de Usuario",
    "settings.label.name": "Nombre Completo",
    "settings.label.email": "Dirección de Correo",
    "settings.label.role": "Rol de Acceso",
    "settings.label.mfa": "Autenticación de Múltiples Factores",
    "settings.mfa_enabled": "Activado",
    "settings.mfa_disabled": "Desactivado",
    "settings.save_settings": "Guardar Ajustes",

    // General / Modals
    "modal.create_patient": "Crear Nuevo Paciente",
    "modal.edit_patient": "Editar Información del Paciente",
    "modal.first_name": "Nombre",
    "modal.last_name": "Apellido",
    "modal.submit": "Enviar",
    "modal.close": "Cerrar"
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('clio_preferred_language');
    if (saved === 'en' || saved === 'es') {
      return saved;
    }
    // Fallback to Spanish or English based on browser settings, but default to 'en'
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('clio_preferred_language', lang);
  };

  const t = (key: string, defaultValue?: string): string => {
    return translations[language][key] || defaultValue || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
