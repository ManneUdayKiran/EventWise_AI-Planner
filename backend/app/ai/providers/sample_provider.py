"""Deterministic sample AI plan provider for offline resilience and reliable fallbacks."""

from typing import Any

from app.ai.providers.base import BaseAIProvider
from app.core.utils import round_currency as _round2
from app.schemas.ai import (
    AIBudgetItemProposal,
    AIPlanResponse,
    AITaskProposal,
    AIVendorCategoryProposal,
)
from app.schemas.budget import BudgetCategory
from app.schemas.task import TaskPriority
from app.schemas.vendor import VendorCategory


class SampleAIProvider(BaseAIProvider):
    """High quality offline fallback plan generator with deterministic output."""

    @property
    def provider_name(self) -> str:
        return "sample"

    async def generate_plan(self, event_context: dict[str, Any]) -> AIPlanResponse:
        event_id = str(event_context.get("id", ""))
        event_type = str(event_context.get("event_type", "wedding")).lower()
        name = str(event_context.get("name", "Special Celebration"))
        location = str(event_context.get("location", "Selected Venue"))
        guests = int(event_context.get("expected_guest_count", 50))
        total_budget = float(event_context.get("total_budget", 5000.0))
        theme = event_context.get("theme") or "Modern Elegance"

        if any(k in event_type for k in ["birthday", "party", "anniversary", "celebration", "shower", "gala", "reunion"]):
            return self._generate_birthday_plan(event_id, name, location, guests, total_budget, theme)
        elif any(k in event_type for k in ["community", "conference", "corporate", "hackathon", "meetup", "summit", "festival", "concert", "seminar"]):
            return self._generate_community_plan(event_id, name, location, guests, total_budget, theme)
        else:
            return self._generate_wedding_plan(event_id, name, location, guests, total_budget, theme)


    def _generate_wedding_plan(
        self, event_id: str, name: str, location: str, guests: int, total_budget: float, theme: str
    ) -> AIPlanResponse:
        summary = (
            f"An exquisite celebration plan for '{name}' set in {location} for {guests} guests, "
            f"styled around a '{theme}' aesthetic with a planned budget of ${total_budget:,.2f}."
        )

        decor = [
            "Romantic floral installations featuring seasonal roses, eucalyptus, and hanging greenery.",
            "Warm ambient string lights, taper candles, and gold accent lanterns for dining tables.",
            "Custom acrylic welcome easel and framed calligraphed seating chart.",
            "Ceremony backdrop arch draped with sheer chiffon fabrics and floral clusters.",
        ]

        food = [
            "Passed gourmet hors d'oeuvres during cocktail hour (truffle arancini, smoked salmon blinis).",
            "Duet plated dinner featuring herb-crusted entrée alongside grilled asparagus and potato puree.",
            "Artisanal three-tiered buttercream wedding cake with late-night dessert bites.",
            "Signature his-and-hers cocktails and premium wine pairing throughout the reception.",
        ]

        entertainment = [
            "Acoustic classical string quartet for ceremony processional and guest arrival.",
            "Live five-piece jazz band for cocktail hour and dinner ambiance.",
            "High-energy professional DJ and MC for reception dancing with customized playlist.",
            "Open-air interactive photo booth with customized photo strips for guests.",
        ]

        # Proportionally compute deterministic budget allocations
        b = total_budget if total_budget > 0 else 10000.0
        budget_items = [
            AIBudgetItemProposal(
                category=BudgetCategory.VENUE,
                item_name="Ceremony & Reception Venue Rental",
                estimated_amount=_round2(b * 0.35),
                notes="Covers full ballroom and outdoor lawn access for 8 hours.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.CATERING,
                item_name="Full Service Food & Beverage Catering",
                estimated_amount=_round2(b * 0.30),
                notes=f"Cocktail hour, plated 3-course dinner, and bar package for {guests} guests.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.PHOTOGRAPHY,
                item_name="Photography & Videography Package",
                estimated_amount=_round2(b * 0.12),
                notes="Two photographers for 8 hours coverage plus high-res digital gallery.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.DECORATION,
                item_name="Floral Centerpieces & Ceremony Arch",
                estimated_amount=_round2(b * 0.10),
                notes="Bridal bouquets, boutonnieres, centerpieces, and arch flowers.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.ENTERTAINMENT,
                item_name="Live Music Ensemble & DJ Services",
                estimated_amount=_round2(b * 0.08),
                notes="Ceremony musicians, cocktail quartet, and reception DJ/MC.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.INVITATIONS,
                item_name="Custom Stationery Suite & Signage",
                estimated_amount=_round2(b * 0.03),
                notes="Save the dates, formal invitations, menus, and table cards.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.MISCELLANEOUS,
                item_name="Event Contingency & Gratuities",
                estimated_amount=_round2(b * 0.02),
                notes="Vendor tips and unforeseen day-of logistical expenses.",
            ),
        ]

        tasks = [
            AITaskProposal(
                title="Book and confirm wedding venue contract",
                category="Venue",
                days_before_event=180,
                priority=TaskPriority.URGENT,
                description="Finalize contract and pay initial deposit to secure date.",
            ),
            AITaskProposal(
                title="Select and book wedding photographer & videographer",
                category="Photography",
                days_before_event=150,
                priority=TaskPriority.HIGH,
                description="Review portfolios and lock in coverage schedule.",
            ),
            AITaskProposal(
                title="Schedule menu tasting and finalize catering contract",
                category="Catering",
                days_before_event=120,
                priority=TaskPriority.HIGH,
                description="Taste meal courses and accommodate dietary restrictions.",
            ),
            AITaskProposal(
                title="Mail out formal wedding invitations with RSVP deadlines",
                category="Invitations",
                days_before_event=90,
                priority=TaskPriority.MEDIUM,
                description="Distribute printed invitations and track digital replies.",
            ),
            AITaskProposal(
                title="Finalize floral concepts and table centerpieces with florist",
                category="Decor",
                days_before_event=60,
                priority=TaskPriority.MEDIUM,
                description="Confirm color palette, flower availability, and delivery logistics.",
            ),
            AITaskProposal(
                title="Submit final guest headcount to caterer and venue",
                category="Logistics",
                days_before_event=14,
                priority=TaskPriority.HIGH,
                description="Provide exact plate count and seating chart.",
            ),
            AITaskProposal(
                title="Hold ceremony rehearsal with wedding party",
                category="Rehearsal",
                days_before_event=1,
                priority=TaskPriority.MEDIUM,
                description="Walk through processional order and sound check.",
            ),
        ]

        vendors = [
            AIVendorCategoryProposal(
                category=VendorCategory.VENUE,
                item_name="Reception Ballroom & Gardens",
                suggested_scope="Facility rental, setup/takedown tables & chairs, lighting.",
                estimated_budget=_round2(b * 0.35),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.CATERING,
                item_name="Full Service Catering & Bartending",
                suggested_scope=f"Passed hors d'oeuvres, dinner service, and bartending for {guests} guests.",
                estimated_budget=_round2(b * 0.30),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.PHOTOGRAPHY,
                item_name="Lead Photographer & Videographer",
                suggested_scope="8-hour full day coverage, drone shots, and wedding highlight film.",
                estimated_budget=_round2(b * 0.12),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.DECORATION,
                item_name="Floral & Event Designer",
                suggested_scope="Custom ceremony arch, aisle florals, and 12-15 dinner table centerpieces.",
                estimated_budget=_round2(b * 0.10),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.ENTERTAINMENT,
                item_name="DJ & Ceremony Musicians",
                suggested_scope="Sound engineering, wireless microphones, and 5 hours of music.",
                estimated_budget=_round2(b * 0.08),
            ),
        ]

        recommendations = [
            f"With {guests} guests, allocate at least 2 bartenders to minimize beverage queue wait times.",
            "Request sample linen swatches under the venue's evening lighting to ensure color fidelity.",
            "Have an indoor weather contingency plan confirmed in writing 48 hours prior to the date.",
        ]

        total_proposed = _round2(sum(item.estimated_amount for item in budget_items))

        return AIPlanResponse(
            event_id=event_id,
            summary=summary,
            theme_and_decor=decor,
            food_recommendations=food,
            entertainment_suggestions=entertainment,
            budget_allocations=budget_items,
            planning_tasks=tasks,
            vendor_categories=vendors,
            personalized_recommendations=recommendations,
            provider_used="sample",
            is_fallback=True,
            total_proposed_budget=total_proposed,
        )

    def _generate_birthday_plan(
        self, event_id: str, name: str, location: str, guests: int, total_budget: float, theme: str
    ) -> AIPlanResponse:
        summary = (
            f"Vibrant and memorable birthday celebration for '{name}' at {location} for {guests} guests, "
            f"designed with an energetic '{theme}' concept on a planned budget of ${total_budget:,.2f}."
        )

        decor = [
            f"Dramatic balloon garland and custom marquee number lights fitting the {theme} theme.",
            "Branded photo backdrop wall with neon LED signage and props.",
            "Contemporary cocktail table arrangements with personalized celebratory coasters.",
        ]

        food = [
            "Interactive chef-attended food stations (street tacos, artisanal sliders, noodle bowls).",
            "Dessert extravaganza table with cupcakes, custom sugar cookies, and mini tarts.",
            "Signature themed mocktail and cocktail bar with vibrant garnishes.",
        ]

        entertainment = [
            "Live DJ playing a customized playlist spanning top favorites across decades.",
            "360-degree slow motion video spinner booth.",
            "Trivia game and milestone toast video projection highlighting memories.",
        ]

        b = total_budget if total_budget > 0 else 3000.0
        budget_items = [
            AIBudgetItemProposal(
                category=BudgetCategory.VENUE,
                item_name="Private Event Space or Lounge Rental",
                estimated_amount=_round2(b * 0.30),
                notes="4-hour private space rental including lounge seating.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.CATERING,
                item_name="Party Food Stations & Custom Birthday Cake",
                estimated_amount=_round2(b * 0.35),
                notes=f"Food station setup and specialty dessert bar for {guests} guests.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.ENTERTAINMENT,
                item_name="Party DJ & 360 Video Booth",
                estimated_amount=_round2(b * 0.15),
                notes="DJ setup with sound equipment and 3-hour video booth rental.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.DECORATION,
                item_name="Bespoke Balloon Arch & Neon Backdrop",
                estimated_amount=_round2(b * 0.12),
                notes="Entrance installation and main photo backdrop.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.PHOTOGRAPHY,
                item_name="Event Candid Photographer",
                estimated_amount=_round2(b * 0.05),
                notes="3 hours of candid party and cake cutting photography.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.MISCELLANEOUS,
                item_name="Party Favors & Games",
                estimated_amount=_round2(b * 0.03),
                notes="Customized gift bags and party accessories.",
            ),
        ]

        tasks = [
            AITaskProposal(
                title="Secure party venue or private lounge reservation",
                category="Venue",
                days_before_event=45,
                priority=TaskPriority.URGENT,
            ),
            AITaskProposal(
                title="Order custom milestone birthday cake and dessert bar",
                category="Catering",
                days_before_event=30,
                priority=TaskPriority.HIGH,
            ),
            AITaskProposal(
                title="Send digital invitations and collect RSVPs",
                category="Invitations",
                days_before_event=25,
                priority=TaskPriority.HIGH,
            ),
            AITaskProposal(
                title="Confirm DJ playlist and video booth rental contract",
                category="Entertainment",
                days_before_event=14,
                priority=TaskPriority.MEDIUM,
            ),
            AITaskProposal(
                title="Assemble party favors and test video slideshow",
                category="Logistics",
                days_before_event=3,
                priority=TaskPriority.LOW,
            ),
        ]

        vendors = [
            AIVendorCategoryProposal(
                category=VendorCategory.VENUE,
                item_name="Lounge / Rooftop Space",
                suggested_scope="Private room rental with bar access and sound hookup.",
                estimated_budget=_round2(b * 0.30),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.CATERING,
                item_name="Artisanal Bakery & Food Station Caterer",
                suggested_scope="Appetizers, specialty birthday cake, and dessert platters.",
                estimated_budget=_round2(b * 0.35),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.ENTERTAINMENT,
                item_name="Live Party DJ & Booth Operator",
                suggested_scope="Sound system, disco lighting, and 360 video booth.",
                estimated_budget=_round2(b * 0.15),
            ),
        ]

        recommendations = [
            "Create a collaborative digital photo album link for guests to upload snaps live during the party.",
            "Schedule cake cutting 90 minutes before the event wrap-up to maximize attendance.",
        ]

        total_proposed = _round2(sum(item.estimated_amount for item in budget_items))

        return AIPlanResponse(
            event_id=event_id,
            summary=summary,
            theme_and_decor=decor,
            food_recommendations=food,
            entertainment_suggestions=entertainment,
            budget_allocations=budget_items,
            planning_tasks=tasks,
            vendor_categories=vendors,
            personalized_recommendations=recommendations,
            provider_used="sample",
            is_fallback=True,
            total_proposed_budget=total_proposed,
        )

    def _generate_community_plan(
        self, event_id: str, name: str, location: str, guests: int, total_budget: float, theme: str
    ) -> AIPlanResponse:
        summary = (
            f"Inclusive and engaging community event plan for '{name}' hosted at {location} for approximately "
            f"{guests} participants, featuring a '{theme}' theme on an allocated budget of ${total_budget:,.2f}."
        )

        decor = [
            "Weather-resistant directional signage, welcome arches, and community bulletin boards.",
            "Eco-friendly bunting, festive fabric canopies, and colored picnic bench covers.",
            "Recycling and compost station markers with clear visual instructions.",
        ]

        food = [
            "Partnership with local food trucks offering varied cultural cuisines and dietary options.",
            "Complimentary hydration stations with fruit-infused water and iced tea.",
            "Community bake sale table featuring donations from neighborhood groups.",
        ]

        entertainment = [
            "Main stage community performances (local bands, cultural dance troupes, youth choir).",
            "Kids' activity pavilion featuring face painting, lawn games, and craft tables.",
            "Raffle drawing and volunteer recognition ceremony.",
        ]

        b = total_budget if total_budget > 0 else 4000.0
        budget_items = [
            AIBudgetItemProposal(
                category=BudgetCategory.VENUE,
                item_name="Park / Community Hall Permit & Security",
                estimated_amount=_round2(b * 0.25),
                notes="Municipal permits, insurance rider, and security staff.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.EQUIPMENT_RENTAL,
                item_name="Tents, Tables, Chairs & Portable Restrooms",
                estimated_amount=_round2(b * 0.25),
                notes="Canopies, 20 tables, 100 folding chairs, and generator power.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.CATERING,
                item_name="Food Truck Stipends & Hydration Stations",
                estimated_amount=_round2(b * 0.20),
                notes="Water dispensers, volunteer lunches, and snack supplies.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.ENTERTAINMENT,
                item_name="Stage Audio Sound System & Performers",
                estimated_amount=_round2(b * 0.15),
                notes="PA system, microphones, sound technician, and performer honorariums.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.DECORATION,
                item_name="Signage, Banners & Activity Materials",
                estimated_amount=_round2(b * 0.10),
                notes="Directional signs, banner printing, and art supply kits.",
            ),
            AIBudgetItemProposal(
                category=BudgetCategory.MISCELLANEOUS,
                item_name="Safety Kits & Waste Disposal",
                estimated_amount=_round2(b * 0.05),
                notes="First aid station, trash bags, recycling bins, and sanitation supplies.",
            ),
        ]

        tasks = [
            AITaskProposal(
                title="File municipal permit and park reservation application",
                category="Permits",
                days_before_event=60,
                priority=TaskPriority.URGENT,
            ),
            AITaskProposal(
                title="Reserve stage, sound system, and canopy tent rentals",
                category="Equipment",
                days_before_event=45,
                priority=TaskPriority.HIGH,
            ),
            AITaskProposal(
                title="Recruit volunteer team and assign role captains",
                category="Volunteers",
                days_before_event=30,
                priority=TaskPriority.HIGH,
            ),
            AITaskProposal(
                title="Publish community announcements and social media schedule",
                category="Marketing",
                days_before_event=21,
                priority=TaskPriority.MEDIUM,
            ),
            AITaskProposal(
                title="Conduct on-site logistics and electrical power walk-through",
                category="Logistics",
                days_before_event=7,
                priority=TaskPriority.HIGH,
            ),
            AITaskProposal(
                title="Execute event setup, sound check, and volunteer orientation",
                category="Day-Of",
                days_before_event=0,
                priority=TaskPriority.URGENT,
            ),
        ]

        vendors = [
            AIVendorCategoryProposal(
                category=VendorCategory.EQUIPMENT_RENTAL,
                item_name="Events & Canopy Equipment Rental Co.",
                suggested_scope="Tents, generators, sound stage, and 100 folding chairs.",
                estimated_budget=_round2(b * 0.25),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.ENTERTAINMENT,
                item_name="Audio Production & Sound Engineer",
                suggested_scope="PA system, 4 microphones, mixer, and on-site technician.",
                estimated_budget=_round2(b * 0.15),
            ),
            AIVendorCategoryProposal(
                category=VendorCategory.CATERING,
                item_name="Local Food Truck Association",
                suggested_scope="On-site concession vending coordinating 3 food trucks.",
                estimated_budget=_round2(b * 0.20),
            ),
        ]

        recommendations = [
            "Set up a dedicated accessibility assistance desk at the main entry point.",
            "Establish a clear emergency muster point and mark all first aid stations with high-visibility flags.",
        ]

        total_proposed = _round2(sum(item.estimated_amount for item in budget_items))

        return AIPlanResponse(
            event_id=event_id,
            summary=summary,
            theme_and_decor=decor,
            food_recommendations=food,
            entertainment_suggestions=entertainment,
            budget_allocations=budget_items,
            planning_tasks=tasks,
            vendor_categories=vendors,
            personalized_recommendations=recommendations,
            provider_used="sample",
            is_fallback=True,
            total_proposed_budget=total_proposed,
        )
