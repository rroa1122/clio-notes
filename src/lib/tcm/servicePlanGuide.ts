/**
 * Service Plan formulation guide (agency standard, ARC SP guide - male and female versions).
 *
 * Source: SP_AMEXZON-_man_8785.docx and SP_AMEXZON-_woman_3809.docx. Goals and objectives are
 * copied word for word; only the client name ({client}), pronouns and dates are adapted.
 * Every Service Plan document field and the "Initial Service Plan Development" note must use
 * this text so the note always matches the document.
 *
 * Tokens: {client} = client's first name; {he} {He} {his} {His} {him} {himself} = pronouns.
 * A block with a `female` variant uses that wording verbatim for female clients; otherwise the
 * male wording is rendered with female pronouns.
 */

export interface ServicePlanGuideBlock {
    key: string;
    domainNumber: number;
    label: string;
    description: string;
    needs: string;
    goal: string;
    objectives: string[];
    responsible: string;
    female?: { goal: string; objectives: string[] };
}

export const SERVICE_PLAN_DOMAIN_LABELS: Record<number, string> = {
    1: 'Mental Health / Substance Abuse',
    2: 'Physical Health / Medical / Dental',
    3: 'Vocational / Employment / Job Training',
    4: 'Educational',
    5: 'Recreational / Social Support',
    6: 'Activities of Daily Living',
    7: 'Housing / Shelter',
    8: 'Economic / Financial',
    9: 'Basic Needs',
    10: 'Transportation',
    11: 'Legal / Immigration',
    12: 'Other',
};

export const SERVICE_PLAN_GUIDE: ServicePlanGuideBlock[] = [
  {
    "key": "domain_mental_health",
    "domainNumber": 1,
    "label": "Mental Health / Substance Abuse",
    "description": "Psychiatrist services/Coordinate appointments.",
    "needs": "{client} needs to continue receiving psychiatric treatment to stabilize {his} mental condition and avoid hospitalizations.",
    "goal": "\"I want to comply with my psychiatric treatment and appointments scheduled by my psychiatrist to avoid crisis and improve my mental condition\". {client} will receive psychiatric treatment to stabilize {his} mental condition and avoid hospitalizations during the next six months.",
    "objectives": [
      "{client} will attend {his} psychiatrist's appointment as scheduled within the next six months. TCM will assist and educate {client} to coordinate, schedule, and reschedule psychiatrist appointments as needed within the next six months to improve {his} level of functioning and monitor the outcomes of the treatment through staffing with the provider within the next six months.",
      "{client} will receive a proper psychiatrist's attendance within the next six months. TCM will advocate on behalf of {client} during psychiatrist appointments as needed. TCM will monitor attendance and clinic outcomes by gathering information on follow-ups at the doctor's office by self-report or during the home visit. TCM will monitor if {client} receives proper treatment and medication within the next six months.",
      "{client}'s living environment, level of functioning, and compliance with medications will be monitored by the TCM during the next six months. During the monthly home visits, the TCM will also count all pills left on medication bottles. TCM will monitor {client}'s mental improvement through {his} report and/or direct observation or during monthly Home Visits. The TCM will assist {client} in scheduling transportation to the psychiatric appointments."
    ],
    "responsible": "TCM, Psychiatrist, and {client}.",
    "female": {
      "goal": "\"I want to comply with my psychiatric treatment and appointments scheduled by my psychiatrist to avoid crisis and improve my mental condition\". {client} will receive psychiatric treatment to stabilize her mental condition and avoid hospitalizations during the next six months.",
      "objectives": [
        "{client} will attend her psychiatrist's appointment as scheduled within the next six months. TCM will assist and educate {client} to coordinate, schedule, and reschedule psychiatrist appointments as needed within the next six months to improve her level of functioning and monitor the outcomes of the treatment through staffing with the provider within the next six months.",
        "{client} will receive a proper psychiatrist's attendance within the next six months. TCM will advocate on behalf of {client} during psychiatrist appointments as needed. TCM will monitor attendance and clinic outcomes by gathering information on follow-ups at the doctor's office by self-report or during the home visit. TCM will monitor if {client} receives proper treatment and medication within the next six months.",
        "{client}'s living environment, level of functioning, and compliance with medications will be monitored by the TCM during the next six months. During the monthly home visits, the TCM will also count all pills left on medication bottles. TCM will monitor {client}'s mental improvement through her report and/or direct observation or during monthly Home Visits. The TCM will assist {client} in scheduling transportation to the psychiatric appointments."
      ]
    }
  },
  {
    "key": "domain_physical_health",
    "domainNumber": 2,
    "label": "Physical Health / Medical / Dental (PCP)",
    "description": "Medical services. Specialists. Vaccination Compliance.",
    "needs": "{client} needs to continue receiving medical treatment from {his} PCP and following medical appointments to keep {his} medical conditions under control.",
    "goal": "\"I don't feel able to control my physical symptoms if I don't comply with my PCP's appointments, medical treatment, and medical instructions\". {client} will receive medical treatment from {his} PCP and follow medical appointments to keep {his} medical conditions under control during the next six months.",
    "objectives": [
      "Over the next six months, {client} is committed to attending all of {his} scheduled medical appointments. {He} will actively collaborate with the TCM's assistance to effectively manage and coordinate the scheduling and any necessary rescheduling of {his} medical appointments.",
      "{client} will inform {his} PCP/specialist about any health progress, and medication side effects during the next six months. TCM will assist {client} in remembering {his} medical appointment. TCM will assist and advocate for {client} during appointments with {his} doctor if {he} requests it. TCM will assist and advocate for {client} in exchanging information with {his} PCP/specialist regarding {his} medical conditions and treatments as part of the coordination of care.",
      "TCM will monitor {client}'s compliance with {his} medical follow-up, {his} treatment, and the medical recommendations through {client}'s report by phone calls or during face-to-face contact, during the next six months. The TCM will assist {client} with {his} PCPs/specialists' recommendations. The TCM will monitor {client}'s physical improvement through phone calls or monthly home visits. The TCM will assist {client} in scheduling transportation to the medical appointments."
    ],
    "responsible": "TCM, {client}, Primary Care Physician.",
    "female": {
      "goal": "\"I don't feel able to control my physical symptoms if I don't comply with my PCP's appointments, medical treatment, and medical instructions\". {client} will receive medical treatment from her PCP and follow medical appointments to keep her medical conditions under control during the next six months.",
      "objectives": [
        "Over the next six months, {client} is committed to attending all of her scheduled medical appointments. She will actively collaborate with the TCM's assistance to effectively manage and coordinate the scheduling and any necessary rescheduling of her medical appointments.",
        "{client} will inform her PCP/specialist about any health progress, and medication side effects during the next six months. TCM will assist {client} in remembering her medical appointment. TCM will assist and advocate for {client} during appointments with her doctor if she requests it. TCM will assist and advocate for {client} in exchanging information with her PCP/specialist regarding her medical conditions and treatments as part of the coordination of care.",
        "TCM will monitor {client}'s compliance with her medical follow-up, her treatment, and the medical recommendations through {client}'s report by phone calls or during face-to-face contact, during the next six months. The TCM will assist {client} with her PCPs/specialists' recommendations. The TCM will monitor {client}'s physical improvement through phone calls or monthly home visits. The TCM will assist {client} in scheduling transportation to the medical appointments."
      ]
    }
  },
  {
    "key": "domain_physical_health_otc",
    "domainNumber": 2,
    "label": "OTC Medications",
    "description": "Over-the-counter (OTC) medications.",
    "needs": "{client} needs to get {his} over-the-counter (OTC) medications, but {he} is having difficulty completing the form and submitting it to {his} health insurance. The CM will assist {client} in obtaining, completing, and submitting the OTC application.",
    "goal": "\"I want to obtain my OTC medicines every month\". {client} will be able to obtain {his} over-the-counter medications with the assistance of the Case Manager.",
    "objectives": [
      "{client} will be assisted by the TCM at the pharmacy in gathering information about {his} medication in the PCP office. TCM will visit the PCP office to obtain the application form on {client}'s behalf.",
      "{client} will complete the OTC form with the TCM's assistance and will be able to submit {his} application form. {He} will be assisted by the TCM in gathering information for any other pharmacy near {his} home if necessary and will assist {him} in enrolling to receive their services.",
      "The TCM will monitor if {client} receives {his} medication through the contact parties involved. In the case {he} needs to change {his} pharmacy, the TCM also will monitor if {client} is receiving the appropriate service from the new pharmacy."
    ],
    "responsible": "TCM, {client}, Pharmacy.",
    "female": {
      "goal": "\"I want to obtain my OTC medications every month\". {client} will be able to obtain her over-the-counter medications with the assistance of the TCM.",
      "objectives": [
        "{client} will be assisted by the TCM at the pharmacy in gathering information about her medication in the PCP office, during the next six months. TCM will visit the PCP office to obtain the application form on {client}'s behalf.",
        "{client} will complete the OTC form with the TCM's assistance and will be able to submit her application form, during the next six months. She will be assisted by the TCM in gathering information for any other pharmacy near her home if necessary and will assist her in enrolling to receive their services.",
        "The TCM will monitor if {client} receives her medication through the contact parties involved. In the case she needs to change her pharmacy, the TCM also will monitor if {client} is receiving the appropriate service from the new pharmacy, during the next six months."
      ]
    }
  },
  {
    "key": "domain_physical_health_alarm",
    "domainNumber": 2,
    "label": "Emergency Alarm",
    "description": "Emergency Alarm.",
    "needs": "{client} needs an Emergency Alarm System to enhance safety and ensure immediate assistance in case of a medical or household emergency due to {his} physical limitations and risk factors.",
    "goal": "{client} stated, \"I want to have an emergency alarm system so I can feel safe at home.\" {client} will obtain an Emergency Alarm System with the assistance of the Targeted Case Manager (TCM) during the next six months to enhance {his} safety, promote independence, and ensure quick access to emergency support.",
    "objectives": [
      "The TCM will research and identify available Emergency Alarm System providers and determine eligibility requirements based on {client}'s insurance coverage.",
      "The TCM will coordinate with {client}'s Primary Care Provider to obtain the required medical order for the Emergency Alarm System.",
      "{client}, with TCM assistance, will complete the application and submit all necessary documentation to initiate approval and installation of the Emergency Alarm System."
    ],
    "responsible": "{client}, Targeted Case Manager (TCM), Primary Care Provider (PCP), Emergency Alarm System Provider, Insurance Company.",
    "female": {
      "goal": "{client} stated, \"I want to have an emergency alarm system so I can feel safe at home.\" {client} will obtain an Emergency Alarm System with the assistance of the Targeted Case Manager (TCM) during the next six months to enhance her safety, promote independence, and ensure quick access to emergency support.",
      "objectives": [
        "The TCM will research and identify available Emergency Alarm System providers and determine eligibility requirements based on {client}'s insurance coverage.",
        "The TCM will coordinate with {client}'s Primary Care Provider to obtain the required medical order for the Emergency Alarm System.",
        "{client}, with TCM assistance, will complete the application and submit all necessary documentation to initiate approval and installation of the Emergency Alarm System."
      ]
    }
  },
  {
    "key": "domain_recreational",
    "domainNumber": 5,
    "label": "Recreational / Social Support",
    "description": "Recreational programs / activities.",
    "needs": "{client} needs to interact with more people and expand {his} social support network, to improve {his} coping skills.",
    "goal": "\"I would like to participate in social and recreational activities.\" {client} will interact with more people and expand {his} social support network during the next six months.",
    "objectives": [
      "{client} will obtain information about the libraries, recreational, cultural and art community activities with the assistance of the CM. The CM will seek if {client} is motivated to participate in every one of these community activities over the next six months.",
      "{client} will discuss with the CM all information that is required to apply in the community centers and libraries. The case manager will assist {client} in obtaining the forms to apply for those programs in the next six months.",
      "{client} will submit the application forms to apply for Recreational Centers/Libraries membership during the next six months. The CM will monitor the outcome of this process."
    ],
    "responsible": "TCM, {client}, Recreational, and Library Centers.",
    "female": {
      "goal": "\"I would like to participate in social and recreational activities.\" {client} will interact with more people and expand her social support network during the next six months.",
      "objectives": [
        "{client} will obtain information about the libraries, and recreational, cultural, and art community activities with the assistance of the TCM. The TCM will determine if {client} is motivated to participate in every one of these community activities over the next six months.",
        "{client} will discuss with the TCM all the information that is required to apply in the community centers and libraries. The TCM will assist {client} in obtaining the forms to apply for those programs in the next six months.",
        "{client} will submit the application forms to apply for Recreational Centers/Libraries membership during the next six months. The TCM will monitor the outcome of this process."
      ]
    }
  },
  {
    "key": "domain_daily_living",
    "domainNumber": 6,
    "label": "Activities of Daily Living",
    "description": "Understand the notifications received from {his} providers. Financial Empowerment and Budgeting Tools.",
    "needs": "{client} cannot understand the notification received from {his} providers. {client} is at risk of losing {his} benefits if {he} does not comply with the requests from {his} providers. {client} needs to understand notifications received from {his} providers and comply with their requests to maintain {his} benefits.",
    "goal": "\"I can't comply by myself with the requests from my providers to keep my government benefits\". {client} will understand the notifications received from {his} providers during the next six months.",
    "objectives": [
      "{client} will identify the remittent from correspondence and will keep them in a safe place during the next six months. {client} will understand notifications from {his} providers. TCM will assist {client} to understand the correspondence sent from the different provider agencies and will discuss with {him} the instructions received if needed.",
      "{client} will complete and submit any information requested by any Provider Agencies promptly to continue receiving Government benefits during the next six months. {client} will comply with any procedure required by the different provider agencies.",
      "{client} will obtain the necessary information to make the correct decision according to what is requested by the different provider agencies in the community, with the TCM's assistance."
    ],
    "responsible": "TCM, {client}, and Different Provider Agencies in the Community (Medicare, Medicaid, SSA, DCF).",
    "female": {
      "goal": "\"I can't comply by myself with the requests from my providers to keep my government benefits\". {client} will understand the notifications received from her providers during the next six months.",
      "objectives": [
        "{client} will identify the remittent from correspondence and will keep them in a safe place during the next six months. {client} will understand notifications from her providers. TCM will assist {client} to understand the correspondence sent from the different provider agencies and will discuss with her the instructions received if needed.",
        "{client} will complete and submit any information requested by any Provider Agencies promptly to continue receiving Government benefits during the next six months. {client} will comply with any procedure required by the different provider agencies.",
        "{client} will obtain the necessary information to make the correct decision according to what is requested by the different provider agencies in the community, with the TCM's assistance, during the next six months."
      ]
    }
  },
  {
    "key": "domain_housing",
    "domainNumber": 7,
    "label": "Housing / Shelter",
    "description": "Apply for available housing programs.",
    "needs": "{client} has a limited source of income; therefore, {he} can't pay for a better place to live. {client} needs to apply for a housing program available in the community to obtain a new home according to {his} monthly income.",
    "goal": "\"I don't have enough money to pay for a better place to live\". {client} will obtain a better place to live according to {his} monthly income during the next six months.",
    "objectives": [
      "{client} will obtain and fill out housing application forms for low-income housing programs available in the community during the next six months. {client} will gather all necessary information/documentation about housing programs available in the community. TCM will link {client} with the low-income housing programs available in the community. TCM will assist {client} in obtaining and completing housing applications for low-income housing programs as well as the documentation required.",
      "{client} will submit the housing application and all additional documentation required promptly. {client} will attend any appointments at Housing offices and will provide all documentation requested as needed. TCM will assist {client} to submit the housing applications and all documents required as part of the process. TCM will assist {client} during an interview at the housing offices as part of the application process.",
      "{client} will update {his} contact information (mailing address, phone number) at the Housing program if needed. TCM will monitor the outcome of the housing application through the client's report about notifications received by phone calls or face-to-face contact. Also, monitoring will be done by contacting housing programs if needed. TCM will assist the client to update {his} contact information at housing programs through phone calls or visits to the housing offices if needed."
    ],
    "responsible": "TCM, {client}, and Housing Program Available in the community",
    "female": {
      "goal": "\"I don't have enough money to pay for a better place to live\". {client} will obtain a better place to live according to her monthly income during the next six months.",
      "objectives": [
        "{client} will obtain and fill out housing application forms for low-income housing programs available in the community during the next six months. {client} will gather all necessary information/documentation about housing programs available in the community. TCM will link {client} with the low-income housing programs available in the community. TCM will assist {client} in obtaining and completing housing applications for low-income housing programs as well as the documentation required.",
        "{client} will submit the housing application and all additional documentation required promptly, during the next six months. {client} will attend any appointments at Housing offices and will provide all documentation requested as needed. TCM will assist {client} in submitting the housing applications and all documents required as part of the process. TCM will assist {client} during an interview at the housing offices as part of the application process.",
        "{client} will update her contact information (mailing address, phone number) at the Housing program if needed, during the next six months. TCM will monitor the outcome of the housing application through the client's report about notifications received by phone calls or face-to-face contact. Also, monitoring will be done by contacting housing programs if needed. TCM will assist the client to update her contact information at housing programs through phone calls or visits to the housing offices if needed."
      ]
    }
  },
  {
    "key": "domain_housing_recert",
    "domainNumber": 7,
    "label": "Housing Recertification",
    "description": "Assistance to recertify {his} housing benefits.",
    "needs": "{client} needs to comply with the requirements of {his} annual housing recertification process to keep {his} housing benefits active.",
    "goal": "\"I want to maintain my housing voucher\". \"I cannot pay regular rent\". {client} will comply with the annual housing recertification process to maintain {his} benefits active within the next six months.",
    "objectives": [
      "{client} will gather updated information to complete the annual housing recertification process to maintain {his} benefits active. TCM will assist {client} in gathering updated information and documentation to complete the annual housing recertification process to maintain {his} benefits active within the next six months.",
      "{client} will comply with any required interview to complete the annual housing recertification process to maintain {his} benefits active. TCM will assist {client} in coordinating if needed, rescheduling, and complying with a required interview to complete the annual housing recertification process to maintain {his} benefits active within the next six months.",
      "{client} will be educated about all the steps that {he} should comply with to complete the annual housing recertification process to maintain {his} benefits active. TCM will monitor the outcome of the process and will educate {client} about all steps that {he} should comply with to complete the annual housing recertification process to maintain {his} benefits active within the next six months."
    ],
    "responsible": "{client}, TCM, Miami Dade Housing Authority"
  },
  {
    "key": "domain_financial_lifeline",
    "domainNumber": 8,
    "label": "Free Phone (Lifeline)",
    "description": "Assistance to be linked with Free Phone services.",
    "needs": "{client} needs to obtain affordable phone services, to maintain communication with {his} medical provider and family.",
    "goal": "\"I can't keep contact with my health providers, my family, or make emergency calls.\" {client} will obtain free phone services with the assistance of the case manager.",
    "objectives": [
      "{client} will obtain the required documentation to complete the application process with the case manager's assistance. {client} will comply with any interview or procedure required.",
      "{client} will choose the better plan according to {his} needs with the case manager's assistance. {client} will complete and submit the application form for Assurance/SafeLink Wireless to obtain a free cellular phone. {client} will provide additional information/documentation to comply with the certification process for Assurance/SafeLink Wireless.",
      "{client} will activate {his} new cell phone once {he} receives it. The case manager will instruct {him} in how to use the new phone. The case manager will monitor application outcomes through contact with all parties involved by notifications received or phone calls. CM will assist {client} during any interview or other procedure required."
    ],
    "responsible": "TCM, {client}; Assurance Wireless (888) 898-4888; SafeLink Wireless (800)378-1684",
    "female": {
      "goal": "\"I can't keep contact with my health providers, my family, or make emergency calls.\" {client} will obtain free phone services with the assistance of the TCM.",
      "objectives": [
        "{client} will obtain the required documentation to complete the application process with the TCM's assistance, during the next 6 months. {client} will comply with any interview or procedure required.",
        "{client} will choose the better plan according to her needs with the TCM's assistance, during the next 6 months. {client} will complete and submit the application form for Assurance Wireless to obtain a free cellular phone. {client} will provide additional information/documentation to comply with the certification process for Assurance Wireless.",
        "{client} will activate her new cell phone once she receives it. The TCM will instruct her on how to use the new phone, during the next months. The TCM will monitor application outcomes through contact with all parties involved by notifications received or phone calls, during the next 6 months. TCM will assist {client} during any interview or other procedure required."
      ]
    }
  },
  {
    "key": "domain_financial",
    "domainNumber": 8,
    "label": "LIHEAP (Electricity Assistance)",
    "description": "Apply for the Low-Income Home Energy Assistance Program (LIHEAP).",
    "needs": "{client} needs to apply for Low Income Home Energy Assistance Program to obtain an electricity credit.",
    "goal": "\"I'm not the same anymore, the electricity price is too high for my income\". {client} will obtain credits for {his} electricity bills over the next six months.",
    "objectives": [
      "{client} will obtain and complete the application form LIHEAP during the next six months. {He} will gather all requested documentation to be submitted along with the application package and will submit the package at the Community Action office. CM will link {him} with LIHEAP. CM will assist {him} in obtaining, completing, and submitting the LIHEAP application package along with all requested documentation. CM will assist {client} and will advocate on {his} behalf during any phone calls and/or interviews.",
      "{client} will comply with any interview or other procedure required. {client} will be aware of any notifications received from the LIHEAP program and will inform CM about it. TCM will advocate on the client's behalf to accomplish each requirement to obtain the LIHEAP benefits.",
      "{client} will be informed about the process outcome. {He} will be instructed on how to monitor and follow up on {his} benefit. CM will monitor the outcome of the LIHEAP application process through {client}'s report about notifications received by phone calls or face-to-face contact. CM will monitor the LIHEAP application status by contacting the Community Action office, or by notifications receive as needed."
    ],
    "responsible": "TCM, {client}, Community Action Offices (Any location applicable)",
    "female": {
      "goal": "\"I'm not the same anymore, the electricity price is too high for my income\". {client} will obtain credits for her electricity bills during the next six months.",
      "objectives": [
        "{client} will obtain and complete the application form LIHEAP during the next six months. She will gather all requested documentation to be submitted along with the application package and will submit the package at the Community Action office. TCM will link her with LIHEAP. TCM will assist her in obtaining, completing, and submitting the LIHEAP application package along with all requested documentation. TCM will assist her and will advocate on her behalf during any phone calls and/or interviews.",
        "{client} will comply with any interview or other procedure required. {client} will be aware of any notifications received from the LIHEAP program and will inform TCM about it. TCM will advocate on the client's behalf to accomplish each requirement to obtain the LIHEAP benefits, during the next six months.",
        "{client} will be informed about the process outcome, during the next months. She will be instructed on how to monitor and follow up on her benefits. TCM will monitor the outcome of the LIHEAP application process through {client}'s report about notifications received by phone calls or face-to-face contact. TCM will monitor the LIHEAP application status by contacting the Community Action office, or by notifications received as needed."
      ]
    }
  },
  {
    "key": "domain_financial_snap",
    "domainNumber": 8,
    "label": "Recertify Food Stamps (SNAP)",
    "description": "Recertify Food Stamps Benefits.",
    "needs": "{client} needs to renew {his} SNAP benefit. {client} needs to keep {his} food stamps benefit received by the Department of Children and Families.",
    "goal": "\"I'm not the same anymore, I can't help myself to do this paperwork\", \"I don't know how to renew the food stamps\". {client} will renew {his} SNAP benefit during the next six months.",
    "objectives": [
      "{client} will be assisted to renew {his} food stamps benefits. {client} will be assisted in updating {his} DCF account on {his} behalf if necessary. The TCM will assist {client} in obtaining all the necessary documentation for this service during the next six months.",
      "{client} will obtain and complete the authorization to disclose information to authorize TCM to renew {his} food stamps at the DCF office and will obtain the eligibility letter with the information about {his} benefits. {client} will be assisted by the TCM to provide all the necessary information and documentation when completing the food stamps application during the next six months.",
      "{client} will be educated about its benefits and {his} renewal. The TCM will advocate on {client}'s behalf and will monitor the renewal of {client}'s food stamps and will inform {him} in case of any news or change in {his} account during the next six months."
    ],
    "responsible": "TCM, {client}, Department of Children and Family.",
    "female": {
      "goal": "\"I'm not the same anymore, I can't help myself to do this paperwork\", \"I don't know how to renew the food stamps\". {client} will renew her SNAP benefit during the next six months.",
      "objectives": [
        "{client} will be assisted to renew her food stamps benefits. {client} will be assisted in updating her DCF account on her behalf if necessary. The TCM will assist {client} in obtaining all the necessary documentation for this service during the next six months.",
        "{client} will obtain and complete the authorization to disclose information to authorize TCM to renew her food stamps at the DCF office and will obtain the eligibility letter with the information about her benefits. {client} will be assisted by the TCM to provide all the necessary information and documentation when completing the food stamps application during the next six months.",
        "{client} will be educated about its benefits and her renewal. The TCM will advocate on {client}'s behalf and will monitor the renewal of {client}'s food stamps and will inform her in case of any news or change in her account during the next six months."
      ]
    }
  },
  {
    "key": "domain_basic_needs",
    "domainNumber": 9,
    "label": "Basic Needs",
    "description": "Access to food, clothing, and household essentials.",
    "needs": "{client} needs food donations, hot meals, and frozen foods, to cover some of {his} basic needs.",
    "goal": "\"I don't feel able to obtain the food, cleaning supplies, clothes, furniture, appliances, and personal care items that I need by myself\". {client} will obtain food donations, hot meals, and frozen foods to cover some of {his} basic needs during the next six months.",
    "objectives": [
      "{client} will receive assistance with food resources from the community for the next six months. {client} will have access to community resources that will help a low-income person to obtain food, cleaning supplies, clothes, furniture, appliances, and personal care items during the next six months.",
      "{client} will receive food, cleaning supplies, clothes, furniture, appliances, and personal care items donations through different community resources for the next six months. The case manager will link {client} with food banks, local churches, charitable organizations, and resources that provide food and donations to low-income families in need.",
      "{client} will be linked with a community network. {client} will be able to apply by {himself} and monitor places and centers that offer donations in {his} community. CM will instruct {client} with relevant information about food donation. CM will monitor application outcomes through contact with all parties involved by notifications received or phone calls."
    ],
    "responsible": "TCM, {client}, food banks, local churches, charitable organizations, and resources that provide food, cleaning supplies, clothes, furniture, appliances, and personal care items donations to low-income families in need.",
    "female": {
      "goal": "\"I don't feel able to obtain the food, cleaning supplies, clothes, furniture, appliances, and personal care items that I need by myself\". {client} will obtain food donations, hot meals, clothes donations, personal care items, furniture, appliances, and cleaning supplies to cover some of her basic needs.",
      "objectives": [
        "{client} will receive assistance with food resources from the community for the next six months. {client} will have access to community resources that will help a low-income person to obtain food, cleaning supplies, clothes, furniture, appliances, and personal care items during the next six months.",
        "{client} will receive food, cleaning supplies, clothes, furniture, appliances, and personal care items donations through different community resources for the next six months. The TCM will link {client} with food banks, local churches, charitable organizations, and resources that provide food and donations to low-income families in need.",
        "{client} will be linked with a community network. {client} will be able to apply by herself and monitor places and centers that offer donations in her community. TCM will instruct {client} with relevant information about food donation. TCM will monitor application outcomes through contact with all parties involved by notifications received or phone calls."
      ]
    }
  },
  {
    "key": "domain_transportation_dpp",
    "domainNumber": 10,
    "label": "Disabled Parking Permit (DPP)",
    "description": "Apply for Disabled Parking Permit.",
    "needs": "{client} grapples with multiple health conditions, warranting the necessity for a disabled parking permit to facilitate {his} mobility and ensure {his} access to essential services.",
    "goal": "\"I aspire to obtain my parking permit for people with disabilities.\" {client} will obtain a disabled parking permit with the case manager's assistance.",
    "objectives": [
      "{client} will proactively seek information about the Tag Agency nearest to {his} residence, intending to visit and articulate {his} situation. To minimize travel challenges, the case manager will support {client} in identifying the most convenient Tag Agency office and assist {him} throughout the registration process. The case manager will also advocate on {his} behalf, explaining the necessity for a disabled parking permit within the next six months.",
      "Over the course of the next six months, {client} commits to fulfilling all paperwork requirements for obtaining the disabled parking permit. The case manager will play a pivotal role in aiding {client} with form completion and ensuring {his} understanding of any recommendations provided by the representatives.",
      "{client} will obtain {his} disabled parking permit within the next six months. The case manager will diligently monitor the progress of this process through regular phone calls or face-to-face reports, ensuring a seamless and supportive experience for {client}."
    ],
    "responsible": "{client}, TCM, PCP, Tag Agency Office (Any location applicable).",
    "female": {
      "goal": "\"I want to obtain my parking permit for disabled people.\" {client} will obtain a disabled parking permit with the TCM's assistance, during the next six months.",
      "objectives": [
        "{client} will gather information about the Tag Agency nearest to her residence. The TCM's role will be pivotal in assisting {client} to identify the most accessible Tag Agency office, minimizing the inconvenience of long-distance travel. The TCM will accompany {client} to the agency, aiding her in explaining the nature of her situation. Furthermore, the TCM will advocate on {client}'s behalf to convey the necessity of obtaining a disabled parking permit within the next six months.",
        "During the next six months, {client} will be committed to fulfilling the paperwork requirements for her disabled parking permit. The TCM will provide essential support, assisting {client} in completing any necessary forms and ensuring a comprehensive understanding of any recommendations presented by the agency representatives. TCM will accompany {client} to the PCP office, aiding her in explaining the necessity of obtaining the parking permit.",
        "{client} will successfully obtain her disabled parking permit. The TCM will closely monitor the progress of this endeavor, maintaining regular communication through phone calls or face-to-face reports, during the next six months. This ongoing support aims to address any challenges that may arise during the final stages of the process. Special Transportation Services (STS)"
      ]
    }
  },
  {
    "key": "domain_transportation_modivcare",
    "domainNumber": 10,
    "label": "Modivcare Transportation",
    "description": "Modivcare Transportation Services.",
    "needs": "{client} needs support with scheduling and coordinating different modes of transportation, including the use of services such as Uber, as well as assistance in modifying and managing applications related to {his} transportation needs (Modivcare Transportation).",
    "goal": "{client} stated that {his} goal is to receive support with the application process for Modivcare transportation services. {He} expressed that having access to this benefit will allow {him} to attend medical appointments regularly, avoid missed treatments, and feel more secure regarding {his} health care.",
    "objectives": [
      "The Case Manager will provide {client} with updated information about the Modivcare transportation program, including eligibility requirements, application process, and benefits, ensuring the client understands how the service operates.",
      "The Case Manager will assist the client in creating a Modivcare account, supporting {him} in entering {his} personal information, including {his} insurance Member ID, and ensuring the account is properly activated for transportation use.",
      "The Case Manager will educate the client on how to properly schedule and coordinate transportation services through Modivcare, including the process for booking, confirming, and managing medical appointments."
    ],
    "responsible": "{client}, Modivcare Company, TCM, Insurance.",
    "female": {
      "goal": "{client} stated, \"I get very anxious and confused when I try to schedule my transportation by myself.\" {client} will maintain continued access to Modivcare transportation services and, with the assistance of the Case Manager, learn how to schedule and manage her rides independently within the next six months to ensure consistent attendance at her medical, psychiatric, and case management appointments.",
      "objectives": [
        "{client} will continue using Modivcare transportation services to attend all scheduled medical, psychiatric, and case management appointments. The Case Manager will assist {client} in confirming her eligibility and ensuring that her Modivcare account information remains active. Assistance will be provided monthly or as needed to schedule and verify upcoming transportation appointments.",
        "{client} will become more confident and independent in managing her own transportation requests. The Case Manager will educate {client} on how to schedule rides through Modivcare's phone system and mobile app, providing step-by-step instructions during visits or phone calls within the next six months.",
        "{client} will reduce anxiety related to transportation coordination. The Case Manager will provide ongoing emotional support, reassurance, and reminders prior to each scheduled trip, and will monitor progress during monthly contacts to ensure {client} feels comfortable using transportation services."
      ]
    }
  },
  {
    "key": "domain_transportation_sts",
    "domainNumber": 10,
    "label": "Special Transportation Services (STS)",
    "description": "Apply for Special Transportation Services (STS).",
    "needs": "{client} needs to complete the application process for Special Transportation Services (STS), a door-to-door transportation program that accommodates individuals with limited mobility. Access to STS will allow {him} to attend medical appointments and fulfill essential errands while maintaining safety and independence.",
    "goal": "{client} stated, \"I feel unable to walk long distances to take public transportation.\" {client} will complete the application process for STS with the assistance of the case manager within the next six months to support {his} mobility and ensure access to essential services.",
    "objectives": [
      "{client} will complete and submit the required STS application form. The TCM will obtain the application, explain each section to {client}, and assist {him} in completing it. The TCM will also provide clarification on required supporting documentation and program expectations, during the next six months.",
      "{client} will comply with all STS program requirements and attend the eligibility interview. The TCM will coordinate the appointment, provide advocacy during the interview process, and maintain contact with the STS program to facilitate clear communication and timely follow-up, during the next six months.",
      "{client} will receive a decision on {his} application and begin using the transportation services if approved. The TCM will monitor the outcome of the application, follow up with the STS office as needed, and provide guidance to {client} on how to use the service appropriately, including scheduling and usage policies, during the next six months."
    ],
    "responsible": "{client}, Targeted Case Manager (TCM), Primary Care Provider (PCP), and Paratransit Services Office (STS Program) -- 701 NW 1st Ct #131, Miami, FL 33136. Phone: (305) 891-3131.",
    "female": {
      "goal": "{client} stated, \"I feel unable to walk long distances to take public transportation.\" {client} will complete the application process for STS with the assistance of the case manager within the next six months to support her mobility and ensure access to essential services.",
      "objectives": [
        "{client} will complete and submit the required STS application form. The TCM will obtain the application, explain each section to {client}, and assist her in completing it. The TCM will also provide clarification on required supporting documentation and program expectations, during the next six months.",
        "{client} will comply with all STS program requirements and attend the eligibility interview. The TCM will coordinate the appointment, provide advocacy during the interview process, and maintain contact with the STS program to facilitate clear communication and timely follow-up, during the next six months.",
        "{client} will receive a decision on her application and begin using the transportation services if approved. The TCM will monitor the outcome of the application, follow up with the STS office as needed, and provide guidance to {client} on how to use the service appropriately, including scheduling and usage policies, during the next six months."
      ]
    }
  },
  {
    "key": "domain_transportation_golden",
    "domainNumber": 10,
    "label": "Golden Passport",
    "description": "Golden Passport.",
    "needs": "{client}, lacking transportation means, is in need of acquiring the Golden Passport card to facilitate {his} mobility.",
    "goal": "\"I'm not the same anymore since I can't visit my family, and friends because I'm unable to walk long distances.\" {client} will obtain the Golden Passport card.",
    "objectives": [
      "{client} will diligently gather all necessary documentation for the Golden Passport application process. With the assistance of {his} case manager, {he} aims to complete the application within the next month, during the next six months.",
      "{client} will meticulously fill out {his} Golden Passport application, ensuring all provided information is accurate. The case manager will assist {client} in completing the application during the next six months. CM will assist confirm the Golden Passport form correctness.",
      "{client} will promptly submit {his} Golden Passport application within the next six months. Subsequently, {his} case manager will oversee the process, monitoring the receipt of the card and verifying its functionality through either visual inspection or communication with {client}."
    ],
    "responsible": "TCM, {client}, Miami Dade Transit Agency 111 NW 1st St #910, Miami, FL 33128, Phone (305) 770-3131.",
    "female": {
      "goal": "\"I'm not the same anymore since I can't visit my family, and friends because I'm unable to walk long distances.\" {client} will obtain the Golden Passport card during the next six months.",
      "objectives": [
        "{client} will diligently gather all necessary documentation for the Golden Passport application process. With the assistance of the case manager, she aims to complete the application within the next six months.",
        "{client} will meticulously fill out her Golden Passport application, ensuring all provided information is accurate. The case manager will assist {client} in completing the application during the next six months. CM will assist confirm the Golden Passport form correctness.",
        "{client} will promptly submit her Golden Passport application within the next six months. Subsequently, the case manager will oversee the process, monitoring the receipt of the card and verifying its functionality through either visual inspection or communication with {client}."
      ]
    }
  },
  {
    "key": "domain_transportation",
    "domainNumber": 10,
    "label": "Transportation (Freebee)",
    "description": "FreeBee Transportation Services.",
    "needs": "{client}, due to {his} mental health diagnoses, cognitive limitations, and medical conditions, does not drive and requires community-based transportation services to safely access healthcare appointments, pharmacies, and essential community resources.",
    "goal": "\"I want reliable transportation so I can get to my appointments and take care of my needs.\"",
    "objectives": [
      "{client} will be linked to Freebee transportation services to support access to local medical appointments, pharmacies, and essential community errands.",
      "The TCM will assist {client} with registration, account setup, and education on how to request and appropriately use Freebee transportation, including reviewing service areas, scheduling procedures, and safety guidelines.",
      "The TCM will provide ongoing support and monitoring to ensure {client} is able to consistently utilize Freebee transportation for appointments and errands and will address any barriers or issues that arise."
    ],
    "responsible": "{client}, Targeted Case Manager (TCM), Freebee Transportation Service"
  },
  {
    "key": "domain_other",
    "domainNumber": 12,
    "label": "Other (Hurricane Season)",
    "description": "Emergency Evacuation Plan of Miami-Dade (Hurricane Season).",
    "needs": "{client} must be linked with the Emergency Evacuation Plan of Miami-Dade to ensure {his} safety and preparedness in emergencies. The case Manager will assist the client with this issue during the hurricane season.",
    "goal": "\"I don't know what I have to do in case a Hurricane appears in Florida\". \"I need an emergency evacuation plan to be safe during this season\".",
    "objectives": [
      "{client} will take proactive steps to be safe and prepared to face potential emergencies, recognizing the importance of being prepared, especially considering {client}'s unique needs. CM will conduct a thorough assessment of {client}'s living situation, taking into account {his} specific requirements and any potential challenges {he} might face during emergencies, during the hurricane season.",
      "{client} will obtain the application at the Miami Dade Emergency Department and CM will assist {him} in completing it during the hurricane season. CM Will educate {client} about the Emergency Evacuation Plan of Miami-Dade, explaining the evacuation routes, designated shelters, and necessary emergency supplies. {client}'s PCP will complete the EEP application.",
      "{client} will be linked with the Miami Dade Emergency Department during the hurricane season. CM will ensure {client} understands the importance of having a plan in place and being familiar with the procedures. Case manager will make a follow-up session with {client} to review the Emergency Evacuation Plan together, answer any questions {he} might have, and address any additional concerns that may arise."
    ],
    "responsible": "Miami Dade Emergency Department 9300 NW 41st St, Doral, FL 33178, phone (786) 331-5000; CM; {client}; PCP."
  }
];

export const SERVICE_PLAN_GUIDE_BY_KEY: Record<string, ServicePlanGuideBlock> = Object.fromEntries(
    SERVICE_PLAN_GUIDE.map(b => [b.key, b])
);

export type ClientGender = 'male' | 'female';

export const resolveClientGender = (patient: any): ClientGender => {
    const raw = String(patient?.gender || patient?.sex || '').trim().toLowerCase();
    return raw.startsWith('f') || raw === 'mujer' || raw === 'femenino' ? 'female' : 'male';
};

const PRONOUNS: Record<ClientGender, Record<string, string>> = {
    male: { he: 'he', He: 'He', his: 'his', His: 'His', him: 'him', himself: 'himself' },
    female: { he: 'she', He: 'She', his: 'her', His: 'Her', him: 'her', himself: 'herself' },
};

export const renderGuideText = (text: string, firstName: string, gender: ClientGender): string => {
    const name = (firstName || '').trim() || 'The client';
    return text
        .replace(/\{client\}/g, name)
        .replace(/\{(he|He|his|His|him|himself)\}/g, (_m, p: string) => PRONOUNS[gender][p] || p);
};

export interface RenderedGuideBlock {
    key: string;
    domainNumber: number;
    domainLabel: string;
    label: string;
    description: string;
    needs: string;
    goal: string;
    objectives: [string, string, string];
    responsible: string;
}

export const renderGuideBlock = (block: ServicePlanGuideBlock, firstName: string, gender: ClientGender): RenderedGuideBlock => {
    const useFemale = gender === 'female' && block.female;
    const goal = useFemale ? block.female!.goal : block.goal;
    const objectives = useFemale ? block.female!.objectives : block.objectives;
    const r = (t: string) => renderGuideText(t, firstName, gender);
    return {
        key: block.key,
        domainNumber: block.domainNumber,
        domainLabel: SERVICE_PLAN_DOMAIN_LABELS[block.domainNumber] || block.label,
        label: block.label,
        description: `DESCRIPTION: ${r(block.description)}\n${r(block.needs)}`,
        needs: r(block.needs),
        goal: r(goal),
        objectives: [r(objectives[0] || ''), r(objectives[1] || ''), r(objectives[2] || '')],
        responsible: r(block.responsible),
    };
};

const isYes = (v: any) => v === true || (typeof v === 'string' && /^(yes|si|sí|true)$/i.test(v.trim()));

/**
 * Which guide blocks apply to a flagged domain. Keys stay stable so values saved in
 * tcm_social_needs (service_plan_goal_<key>, ...) keep pointing at the same need.
 */
export const getServicePlanBlockKeys = (domainKey: string, socialNeeds: Record<string, any> = {}): string[] => {
    switch (domainKey) {
        case 'domain_physical_health': {
            const keys = ['domain_physical_health'];
            if (isYes(socialNeeds.medicaid_recipient)) keys.push('domain_physical_health_otc');
            if (isYes(socialNeeds.emergency_alarm_needed)) keys.push('domain_physical_health_alarm');
            return keys;
        }
        case 'domain_housing':
            return [isYes(socialNeeds.plan_8) ? 'domain_housing_recert' : 'domain_housing'];
        case 'domain_financial': {
            const keys: string[] = [];
            if (isYes(socialNeeds.liheap_needed)) keys.push('domain_financial');
            if (isYes(socialNeeds.lifeline_needed)) keys.push('domain_financial_lifeline');
            if (isYes(socialNeeds.snap_recipient)) keys.push('domain_financial_snap');
            return keys.length ? keys : ['domain_financial'];
        }
        case 'domain_transportation': {
            const keys: string[] = [];
            if (isYes(socialNeeds.parking_permit_needed)) keys.push('domain_transportation_dpp');
            if (isYes(socialNeeds.sts_needed)) keys.push('domain_transportation_sts');
            if (isYes(socialNeeds.golden_passport_needed)) keys.push('domain_transportation_golden');
            if (isYes(socialNeeds.modivcare_needed)) keys.push('domain_transportation_modivcare');
            return keys.length ? keys : ['domain_transportation'];
        }
        default:
            return SERVICE_PLAN_GUIDE_BY_KEY[domainKey] ? [domainKey] : [];
    }
};

/** Domain keys that can appear in a Service Plan, in document order. */
export const SERVICE_PLAN_DOMAIN_KEYS = [
    'domain_mental_health',
    'domain_physical_health',
    'domain_recreational',
    'domain_daily_living',
    'domain_housing',
    'domain_financial',
    'domain_basic_needs',
    'domain_transportation',
    'domain_other',
];

/**
 * Defaults written by older Clio versions (not from the agency guide). A saved value equal to
 * one of these was never edited by the TCM, so the guide text replaces it.
 */
export const LEGACY_SERVICE_PLAN_DEFAULTS = new Set<string>([
    "\"I want to obtain my OTC medicines every month\". Client will be able to obtain his/her over-the-counter medications with the assistance of the Case Manager.",
    "Client is committed to attending all of his scheduled primary care and specialist medical appointments.",
    "Client stated, \"I want to have an emergency alarm system so I can feel safe at home.\" Client will obtain an Emergency Alarm System with the assistance of the Targeted Case Manager (TCM) during the next six months to enhance his/her safety, promote independence, and ensure quick access to emergency support.",
    "Client will apply for and activate a lifeline cell phone to maintain communication with providers.",
    "Client will attend his psychiatrist's appointment as scheduled within the next six months to improve his level of functioning.",
    "Client will be linked to community-based transportation services such as Freebee or SafeRide.",
    "Client will inform his PCP/specialist about any health progress and medication side effects.",
    "Client will obtain Special Transportation Services (STS) to facilitate door-to-door paratransit mobility.",
    "Client will obtain a Handicap Parking Permit to facilitate accessible parking access.",
    "Client will obtain and fill out housing application forms for low-income housing programs.",
    "Client will obtain information about emergency alarm systems and programs with the assistance of the TCM.",
    "Client will obtain information about libraries and senior community centers with the assistance of the TCM.",
    "Client will obtain required documentation to complete LIHEAP utility assistance application.",
    "Client will receive assistance accessing food resources and pantry programs in the community.",
    "Client's living environment, level of functioning, and compliance with medications will be monitored by the TCM.",
    "DESCRIPTION: Emergency Alarm.",
    "DESCRIPTION: Handicap Parking Permit.",
    "DESCRIPTION: Medical services. Specialists. Vaccination Compliance.",
    "DESCRIPTION: Over-the-counter (OTC) medications.",
    "DESCRIPTION: Special Transportation Services (STS).",
    "DESCRIPTION: Transportation.",
    "I want reliable transportation so I can get to my medical appointments and take care of my needs.",
    "I want to comply with my psychiatric treatment and appointments scheduled by my psychiatrist to avoid crisis and improve my mental condition.",
    "I want to obtain a better and safe place to live according to my monthly income.",
    "I want to obtain assistance with utility bills and phone services to reduce my financial burden.",
    "I want to obtain food donations, hot meals, and personal care items to cover some of my basic needs.",
    "I want to receive medical treatment from my PCP and follow medical appointments to keep my medical conditions under control.",
    "I want to stay independent and make sure I don't lose my benefits or miss important appointments.",
    "I would like to participate in social and recreational activities to expand my support network and reduce isolation.",
    "TCM will advocate on behalf of client during psychiatrist appointments as needed and monitor clinic outcomes.",
    "TCM will assist client in completing and submitting the emergency alarm application forms.",
    "TCM will assist client in completing and submitting utility, SNAP, or other community service applications.",
    "TCM will assist client in obtaining membership applications and forms for community programs.",
    "TCM will assist client in obtaining the disabled parking permit application form.",
    "TCM will assist client in obtaining, completing, and submitting the STS application form.",
    "TCM will assist client with account setup, registration, and scheduling procedures.",
    "TCM will coordinate linkage and monitor that the emergency alarm system is correctly installed and functioning.",
    "TCM will coordinate referrals and linkage to additional community-based support services.",
    "TCM will coordinate with PCP to complete the medical certification section of the DPP form.",
    "TCM will link client with food banks, churches, and charitable donation resources.",
    "TCM will link client with housing programs and assist with gathering required documentation.",
    "TCM will monitor STS application status and assist with scheduling rides once approved.",
    "TCM will monitor application outcomes and coordinate with assistance offices.",
    "TCM will monitor client's compliance with medical follow-up and treatment recommendations.",
    "TCM will monitor client's food security and basic needs status.",
    "TCM will monitor client's social engagement and participation outcomes.",
    "TCM will monitor the outcome of the housing application and update contact info as needed.",
    "TCM will monitor transit access and resolve any transportation barriers.",
    "TCM will provide monthly assistance reviewing provider correspondence, notifications, and letters.",
    "TCM will schedule required doctor verification appointment and coordinate transportation for the evaluation.",
    "TCM will submit the completed DPP application to the DMV and monitor permit delivery.",
    "The TCM will monitor if client receives his/her medication through the contact parties involved."
]);

export const isServicePlanValueUnedited = (value: any): boolean => {
    if (value === undefined || value === null) return true;
    const v = String(value).trim();
    if (!v) return true;
    if (LEGACY_SERVICE_PLAN_DEFAULTS.has(v)) return true;
    if (/^DESCRIPTION: .* services \/ Coordinate appointments\.$/.test(v)) return true;
    if (/^DESCRIPTION: [^\n]*$/.test(v) && LEGACY_SERVICE_PLAN_DEFAULTS.has(v)) return true;
    if (/ has identified needs in /.test(v)) return true;
    if (/ needs assistance with [a-z /&()-]+\.$/.test(v)) return true;
    return false;
};

export interface ResolvedServicePlanEntry extends RenderedGuideBlock {
    domainKey: string;
    status: string;
    dateIdentified: string;
    objectiveDates: [string, string, string];
    /** true when goal/objectives come straight from the guide (not edited by the TCM). */
    fromGuide: boolean;
}

/**
 * Resolve the Service Plan exactly as the document shows it: TCM-edited values win; anything
 * empty or left over from old Clio defaults is filled from the agency guide. Objective dates
 * default to the plan target date.
 */
export const resolveServicePlan = (patient: any): ResolvedServicePlanEntry[] => {
    const sn: Record<string, any> = patient?.tcm_social_needs || {};
    const gender = resolveClientGender(patient);
    const first = getClientFirstName(patient);
    const planDate = sn.service_plan_date || '';
    const target = sn.service_plan_target_date || '';
    const out: ResolvedServicePlanEntry[] = [];
    SERVICE_PLAN_DOMAIN_KEYS.forEach(domainKey => {
        if (sn[domainKey] !== true) return;
        getServicePlanBlockKeys(domainKey, sn).forEach(key => {
            const block = SERVICE_PLAN_GUIDE_BY_KEY[key];
            if (!block) return;
            const g = renderGuideBlock(block, first, gender);
            const pick = (field: string, fallback: string) => {
                const saved = sn[field];
                return isServicePlanValueUnedited(saved) ? fallback : String(saved);
            };
            // Base block: the needs text edited in the document lives in `${domainKey}_needs`.
            const assessmentNeeds = key === domainKey ? (sn[`${domainKey}_needs`] || '') : '';
            const goal = pick(`service_plan_goal_${key}`, g.goal);
            const o1 = pick(`service_plan_obj1_${key}`, g.objectives[0]);
            const o2 = pick(`service_plan_obj2_${key}`, g.objectives[1]);
            const o3 = pick(`service_plan_obj3_${key}`, g.objectives[2]);
            out.push({
                ...g,
                domainKey,
                description: pick(`service_plan_description_${key}`, g.description),
                needs: !isServicePlanValueUnedited(assessmentNeeds)
                    ? String(assessmentNeeds)
                    : pick(`service_plan_needs_${key}`, g.needs),
                goal,
                objectives: [o1, o2, o3],
                status: sn[`service_plan_status_${key}`] || 'New',
                dateIdentified: sn[`service_plan_date_${key}`] || sn[`service_plan_date_${domainKey}`] || planDate,
                objectiveDates: [
                    sn[`service_plan_obj1_date_${key}`] || target,
                    sn[`service_plan_obj2_date_${key}`] || target,
                    sn[`service_plan_obj3_date_${key}`] || target,
                ],
                fromGuide: goal === g.goal && o1 === g.objectives[0] && o2 === g.objectives[1] && o3 === g.objectives[2],
            });
        });
    });
    return out;
};

const deriveFirstName = (fullName: string): string => {
    const s = String(fullName || '').trim();
    if (!s) return '';
    const first = s.includes(',') ? (s.split(',')[1] || '').trim().split(/\s+/)[0] : s.split(/\s+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
};

export const getClientFirstName = (patient: any): string => {
    const f = String(patient?.first_name || '').trim();
    if (f) return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
    return deriveFirstName(patient?.full_name || '');
};

const DOMAIN_NUMBERS: Record<string, number> = {
    domain_mental_health: 1,
    domain_physical_health: 2,
    domain_vocational: 3,
    domain_education: 4,
    domain_recreational: 5,
    domain_daily_living: 6,
    domain_housing: 7,
    domain_financial: 8,
    domain_basic_needs: 9,
    domain_transportation: 10,
    domain_legal: 11,
    domain_other: 12,
};

export const getServicePlanDomainNumber = (domainKey: string): number => DOMAIN_NUMBERS[domainKey] || 0;

/** Transition / Discharge Criteria, verbatim from the guide (male and female versions). */
export const SERVICE_PLAN_DISCHARGE_CRITERIA: Record<ClientGender, string> = {
    male: 'When {client} improves and remains stable in {his} mental and physical health conditions. {client} should have completed most of {his} goals and objectives on {his} Service Plan and gained some level of independence and self-sufficiency. Coordination of continued treatment and services must be done upon discharge to avoid setbacks and to assure full recovery. If {client} loses eligibility or refuses CM services.',
    female: "{client} will be discharged when she has achieved a stable diagnosis, full remission, or is discharged from psychiatric services. When she is mentally stable and able to effectively manage her problems and meet her needs without assistance. When {client} refuses TCM's services. When she has connected with and is receiving support from the community network. When she has obtained sufficient tools and strengths to continue moving forward. When she has been instructed and educated on how to access and request available benefits on her own. When {client} does not meet eligibility criteria. When {client} moves out of the state or the accessible area for TCM services or is away for an extended period. When {client} does not comply with agency policies.",
};

export const getServicePlanDischargeCriteria = (patient: any): string => {
    const saved = patient?.tcm_social_needs?.service_plan_discharge_criteria;
    if (saved && String(saved).trim()) return String(saved);
    const gender = resolveClientGender(patient);
    return renderGuideText(SERVICE_PLAN_DISCHARGE_CRITERIA[gender], getClientFirstName(patient), gender);
};

/** What the "Initial Service Plan Development" workflow receives (the document as Clio shows it). */
export const buildServicePlanDocumentPayload = (patient: any) => {
    const sn: Record<string, any> = patient?.tcm_social_needs || {};
    return {
        plan_date: sn.service_plan_date || '',
        target_date: sn.service_plan_target_date || '',
        discharge_criteria: getServicePlanDischargeCriteria(patient),
        entries: resolveServicePlan(patient).map(e => ({
            domain_number: e.domainNumber,
            domain: e.domainLabel,
            need: e.label,
            description: e.description.split('\n')[0].replace(/^DESCRIPTION:\s*/, ''),
            needs_identified: e.needs,
            long_term_goal: e.goal,
            objectives: e.objectives,
            objective_target_dates: e.objectiveDates,
            responsible: e.responsible,
        })),
    };
};

/** The note marks where the goals go; Clio writes them from the document, word for word. */
export const SERVICE_PLAN_GOALS_PLACEHOLDER = '[[SERVICE_PLAN_GOALS]]';

export const formatServicePlanGoalsBlock = (patient: any): string => {
    const doc = buildServicePlanDocumentPayload(patient);
    if (!doc.entries.length) {
        return '[CONFIRM: domains, long-term goals and objectives of the Service Plan document]';
    }
    const lines: string[] = [];
    doc.entries.forEach(e => {
        lines.push(`Domain #${e.domain_number} ${e.domain} - ${e.description}`);
        lines.push(`Needs Identified: ${e.needs_identified}`);
        lines.push(`Long-Term Goal: ${e.long_term_goal}`);
        e.objectives.forEach((o, i) => {
            if (!o) return;
            const d = e.objective_target_dates[i];
            lines.push(`Objective ${i + 1}${d ? ` (Target Date: ${d})` : ''}: ${o}`);
        });
    });
    return lines.join('\n');
};

/** Replaces the placeholder in the narrative (or appends the block if the model omitted it). */
export const injectServicePlanGoals = (note: any, patient: any): void => {
    if (!note || !patient) return;
    const block = formatServicePlanGoalsBlock(patient);
    const apply = (narr: any) => {
        if (!narr || typeof narr.summary_notes !== 'string') return;
        const text: string = narr.summary_notes;
        if (text.includes(SERVICE_PLAN_GOALS_PLACEHOLDER)) {
            narr.summary_notes = text.replace(SERVICE_PLAN_GOALS_PLACEHOLDER, block);
        } else if (!text.includes('Long-Term Goal:')) {
            narr.summary_notes = `${text.trimEnd()}\n${block}`;
        }
    };
    apply(note.narrative);
    if (Array.isArray(note.joint_services)) note.joint_services.forEach((s: any) => apply(s?.narrative));
};

/** "Discuss and Sign Initial Services Plan": goal-by-goal review, same order and wording as the document. */
export const SERVICE_PLAN_GOAL_REVIEW_PLACEHOLDER = '[[SERVICE_PLAN_GOAL_REVIEW]]';

export const formatServicePlanGoalReview = (patient: any): string => {
    const doc = buildServicePlanDocumentPayload(patient);
    if (!doc.entries.length) {
        return '[CONFIRM: goals of the Service Plan document]';
    }
    return doc.entries
        .map((e, i) => {
            const target = e.objective_target_dates.find(Boolean);
            return `Goal #${i + 1}: Domain #${e.domain_number} ${e.domain} (${e.description.replace(/\.$/, '')}): ${e.long_term_goal}${target ? ` Target Date: ${target}.` : ''}`;
        })
        .join('\n');
};

export const injectServicePlanGoalReview = (note: any, patient: any): void => {
    if (!note || !patient) return;
    const block = formatServicePlanGoalReview(patient);
    const apply = (narr: any) => {
        if (!narr || typeof narr.summary_notes !== 'string') return;
        const text: string = narr.summary_notes;
        if (text.includes(SERVICE_PLAN_GOAL_REVIEW_PLACEHOLDER)) {
            narr.summary_notes = text.replace(SERVICE_PLAN_GOAL_REVIEW_PLACEHOLDER, block);
        } else if (!/Goal #1:/.test(text)) {
            narr.summary_notes = `${text.trimEnd()}\n${block}`;
        }
    };
    apply(note.narrative);
    if (Array.isArray(note.joint_services)) note.joint_services.forEach((s: any) => apply(s?.narrative));
};
