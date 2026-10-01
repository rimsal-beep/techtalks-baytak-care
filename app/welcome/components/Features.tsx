import FeaturesHead from "./features/FeaturesHead";
import FeatureProperties from "./features/FeatureProperties";
import FeatureRequests from "./features/FeatureRequests";
import FeatureChecklists from "./features/FeatureChecklists";
import FeatureBeforeAfter from "./features/FeatureBeforeAfter";

/** To add a feature: create a file in ./features and place it here. */
export default function Features() {
  return (
    <section className="features" id="features">
      <div className="wrap">
        <FeaturesHead />
        <FeatureProperties />
        <FeatureRequests />
        <FeatureChecklists />
      </div>
      <FeatureBeforeAfter />
    </section>
  );
}