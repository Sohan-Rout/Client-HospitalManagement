import { Phone, Mail, MapPin, Clock } from "lucide-react";

const features = [
    {
        title : "talk to our expert",
        icon : <Phone></Phone>,
        subtitle : "+1(123)456-7890",
    },
    {
        title : "send us your queries",
        icon : <Mail></Mail>,
        subtitle : "Medsynce@gmail.com",
    },
    {
        title : "where to find us",
        icon : <MapPin></MapPin>,
        subtitle : "New Delhi, India",
    },
    {
        title : "service hours",
        icon : <Clock></Clock>,
        subtitle : "Mon - Sat: 9:30 - 5",
    }
];

export default function Form(){
    return(
        <main className="flex flex-col gap-10 items-center justify-between">
            <div className="flex gap-10 items-center justify-between pt-12">
                <div>
                <img className="rounded-2xl h-158" src="/contact/form.webp"/>
            </div>

            <form className="flex flex-col h-[90vh] justify-between gap-4 w-124 bg-neutral-200/50 p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col">
                    <label className="mb-2 font-medium">Name*</label>
                    <input 
                        required
                        type="text" 
                        placeholder="Enter your name" 
                        className="py-2 px-4 bg-white rounded-full outline-none"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-2 font-medium">Phone*</label>
                    <input 
                        required
                        type="tel" 
                        placeholder="Enter your phone number" 
                        className="py-2 px-4 bg-white rounded-full outline-none"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-medium">Email Address*</label>
                    <input 
                        required
                        type="email" 
                        placeholder="Enter your email" 
                        className="py-2 px-4 bg-white rounded-full outline-none"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-medium">Service*</label>
                    <select className="py-2 px-4 bg-white rounded-full outline-none">
                        <option>Select a service</option>
                        <option>General Checkup</option>
                        <option>Dental</option>
                        <option>Cardiology</option>
                        <option>Dermatology</option>
                    </select>
                </div>

                <div className="flex gap-8 items-center w-full">
                    <div className="flex flex-col">
                    <label className="mb-1 font-medium">Date*</label>
                    <input 
                        type="date" 
                        className="py-2 px-4 bg-white rounded-full outline-none w-42"
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-medium">Time*</label>
                    <input 
                        type="time" 
                        className="py-2 px-4 bg-white rounded-full outline-none w-42"
                    />
                </div>
                </div>

                <button 
                    type="submit" 
                    className="mt-4 bg-blue-500 text-white py-2 rounded-full hover:bg-blue-700 transition"
                >
                    Book Appointment
                </button>
            </form>
            </div>

            <div className="grid grid-cols-4 gap-6">
                {features.map((item, index) => (
                    <div className="flex w-66 rounded-xl p-4 items-center justify-center gap-2 bg-neutral-200/50" key={index}>
                        <div className="bg-blue-500 p-4 rounded-full">
                            <div className="text-white">{item.icon}</div>
                        </div>
                        <div>
                            <h1 className="text-sm">{item.title}</h1>
                        <p className="text-md">{item.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}