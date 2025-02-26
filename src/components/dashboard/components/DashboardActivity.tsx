import React from 'react';

const DashboardActivity = () => {
  return (
    <div className="h-full rounded-lg border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Recent Activity
        </h4>
      </div>

      <div className="flex flex-col gap-4">
        {/* Add your activity items here */}
        <div className="flex items-center gap-3 rounded-lg border border-stroke p-4 dark:border-strokedark">
          <div className="flex-1">
            <p className="text-sm font-medium text-black dark:text-white">
              New molecule generated
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              2 hours ago
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardActivity;
