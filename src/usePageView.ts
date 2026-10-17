export const usePageView = () => {
  const togglePage = (targetName: string) => {
    const target = document.getElementsByClassName(targetName)[0];

    target?.classList.toggle("enabled");
  };

  return { togglePage };
};
