import { useEffect, useState } from "react";
import { BackIcon } from "./settings";

export const RecentsListView = ({ changePage }: { changePage: () => void }) => {
  const [recentUploads, setRecentUploads] = useState<string[]>([
    "foto.png",
    "Windows11-26h2.iso",
  ]);
  return (
    <div className="wrapper page recents">
      <div className="page-title">
        <div className="icon-fixed" onClick={() => changePage()}>
          <BackIcon />
        </div>
        <h3>Recent Uploads</h3>
      </div>
      {recentUploads.length > 0 && (
        <ul className="recent-list">
          {recentUploads.map((upload, index) =>
            Array(5).fill(<li key={index}>{upload}</li>),
          )}
        </ul>
      )}
    </div>
  );
};
