type ProgressBarProps = {
  status: number;
};

export const ProgressBar = (props: ProgressBarProps) => {
  return (
    <div className="progressbar">
      <div className="is-loading" style={{ width: `${props.status}%` }}></div>
    </div>
  );
};
