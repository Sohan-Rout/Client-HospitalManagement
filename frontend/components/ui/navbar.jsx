import Activity from "lucide-react/dist/esm/icons/activity";
import House from "lucide-react/dist/esm/icons/house";
import TableOfContent from "lucide-react/dist/esm/icons/table-of-contents";
import QuestionMark from "lucide-react/dist/esm/icons/circle-question-mark";

const navlinks = [
    {
        icon : <House size={18} />,
        title : "Home",
        link : "/",
    },
    {
        icon : <QuestionMark size={18} />,
        title : "About Us",
        link : "/",
    },
    {
        icon : <TableOfContent size={18} />,
        title : "Services",
        link : "/",
    },
];

export default function Navbar(){
    return(
        <main className="flex bg-white py-2 px-4 rounded-2xl justify-between items-center">
            <div className="flex items-center justify-center gap-2">
                <span className="p-2 bg-cyan-500 rounded-2xl">
                    <Activity className="text-white" />
                </span>
                <div className="flex flex-col items-start">
                    <h1 className="text-black font-semibold uppercase">ABC Hospital</h1>
                    <span className="text-xs">Care Portal</span>
                </div>
            </div>

            <ul className="flex text-sm gap-4">
                {navlinks.map((item, index) => (
                    <li key={index}>
                        <a href={item.Link} className="flex gap-2 items-center bg-neutral-100 px-4 py-2 rounded-full">
                            {item.icon}{item.title}
                        </a>
                    </li>
                ))}
            </ul>

            <a className='px-6 py-4 rounded-full duration-300 hover:bg-orange-400 shadow-lg bg-orange-500 text-white' href="/">Get Started</a>
        </main>
    );
}