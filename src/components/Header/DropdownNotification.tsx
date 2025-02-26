import { useState } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import ClickOutside from "../ClickOutside";

const DropdownNotification = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "New Protein Structure Added",
      description: "A new protein structure has been added to the database.",
      time: "5 min ago",
      unread: true,
    },
    {
      id: 2,
      title: "Research Update",
      description: "Your research project has been updated with new findings.",
      time: "45 min ago",
      unread: true,
    },
    {
      id: 3,
      title: "System Maintenance",
      description: "System maintenance scheduled for tomorrow at 2 AM EST.",
      time: "2 hours ago",
      unread: false,
    },
  ];

  return (
    <li className="relative">
      <ClickOutside onClick={() => setDropdownOpen(false)}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
        >
          <span className="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1">
            <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
          </span>

          <BellIcon className="fill-current duration-300 ease-in-out" />
        </button>

        <div
          className={`absolute -right-27 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0 sm:w-80 ${
            dropdownOpen === true ? "block" : "hidden"
          }`}
        >
          <div className="px-4.5 py-3">
            <h5 className="text-sm font-medium text-bodydark2">
              Notifications
            </h5>
          </div>

          <ul className="flex h-auto flex-col overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  className="flex flex-col gap-2.5 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                  href="#"
                >
                  <p className="text-sm">
                    <span
                      className={`text-black dark:text-white ${notification.unread ? "font-bold" : ""}`}
                    >
                      {notification.title}
                    </span>{" "}
                    {notification.description}
                  </p>

                  <p className="text-xs text-black dark:text-white">{notification.time}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </ClickOutside>
    </li>
  );
};

export default DropdownNotification;