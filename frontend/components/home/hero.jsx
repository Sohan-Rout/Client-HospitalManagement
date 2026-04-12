import Hospital from "lucide-react/dist/esm/icons/hospital";
import Bed from "lucide-react/dist/esm/icons/bed";
import Smartphone from "lucide-react/dist/esm/icons/smartphone";

export default function Hero(){
    return(
        <main
          className="flex flex-col gap-8 items-center justify-center min-h-[50vh]"
        >
            <div className="bg-white px-4 py-2 rounded-full">
                <span className="text-sm">Used by over 100+ Hospitals</span>
            </div>

            <div className="max-w-2xl flex flex-col gap-2">
               <h1 className="text-6xl text-center">Unified portal login for every care role</h1> 
               <span className="text-lg text-center">A cleaner hospital sign-in experience for patients, doctors, nurses, and admins</span>
            </div> 

            <div className="flex gap-4">
                <a href="/" className="shadow-lg rounded-full px-6 py-4 bg-orange-500 text-white">Watch Demo</a>
                <a href="/" className="shadow-lg rounded-full px-6 py-4 bg-white text-black">Learn More</a>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 shadow-xl flex flex-col gap-2 w-xs bg-white hover:bg-blue-500 hover:text-white duration-300 p-4 rounded-2xl">
                    <div className="bg-blue-500 w-fit p-2 rounded-full">
                        <Hospital className="text-white" />
                    </div>
                    <h1 className="text-lg">
                        Doctor Schedule
                    </h1>
                    <p className="text-sm">
                        Find and Schedule appointments with top doctors at your prefered hospital.
                    </p>
                </div>

                <div className="col-span-1 shadow-xl flex flex-col gap-2 w-xs bg-white hover:bg-blue-500 hover:text-white duration-300 p-4 rounded-2xl">
                    <div className="bg-blue-500 w-fit p-2 rounded-full">
                        <Bed className="text-white" />
                    </div>
                    <h1 className="text-lg">
                        Room Info
                    </h1>
                    <p className="text-sm">
                        Immediate access to emergency care. Find the nearest hospital and get urgent help.
                    </p>
                </div>

                <div className="col-span-1 shadow-xl flex flex-col gap-2 w-xs bg-white hover:bg-blue-500 hover:text-white duration-300 p-4 rounded-2xl">
                    <div className="bg-blue-500 w-fit p-2 rounded-full">
                        <Smartphone className="text-white" />
                    </div>
                    <h1 className="text-lg">
                        Online Registration
                    </h1>
                    <p className="text-sm">
                        Find and Schedule appointments with top doctors at your prefered hospital.
                    </p>
                </div>
            </div>
        </main>
    );
}