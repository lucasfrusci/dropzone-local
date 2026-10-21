export const usePageView = () => {
  const togglePage = (targetName: string) => {
    const target = document.getElementsByClassName(targetName)[0];
    const main = document.getElementsByClassName("main page")[0];

    target?.classList.toggle("enabled");
    main?.classList.toggle("enabled");
  };

  return { togglePage };
};
