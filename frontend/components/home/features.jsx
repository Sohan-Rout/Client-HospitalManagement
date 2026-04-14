const cards = [
    {
        title : "Primary care",
        description : "Fast access to general consultations, follow-ups, and health records in one responsive flow.",
    },
    {
        title : "Emergency coordination",
        description : "Triage ordering, severity visibility, and queue updates.",
    },
    {
        title : "Doctor collaboration",
        description : "Chat, prescriptions, and patient summaries presented in a calm, clinical interface.",
    },
    {
        title : "24/7 emergency intake",
        description : "Role-based triage views, faster decision-making, and a cleaner patient handoff experience.",
    },
    {
        title : "Connected care teams",
        description : "Appointments, doctor chat, prescriptions, and alerts stay visible inside one dashboard rhythm.",
    },
    {
        title : "Operations clarity",
        description : "Admins and super admins can track hospital load, user roles, and active risk in real time.",
    }
]

export default function Features(){
    return(
        <main className="flex flex-col items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4 justify-center">
                <span className="text-sm uppercase bg-orange-500 text-white rounded-full px-4 py-2">Clinical focus</span>
                <h1 className="text-4xl">
                    Cleaner digital front door for care delivery
                </h1>
                <span className="max-w-xl text-center">
                    We provide exceptional care with a patient first approach, advanced facilities and expert doctors for high quality treatments.
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 py-12 w-full max-w-6xl">
                {cards.map((item, index) => (
                    <div className="w-full space-y-2 bg-white p-8 border border-black/25" key={index}>
                        <h1 className="text-xl">{item.title}</h1>
                        <span className="text-sm">{item.description}</span>
                    </div>
                ))}
            </div>
        </main>
    );
}