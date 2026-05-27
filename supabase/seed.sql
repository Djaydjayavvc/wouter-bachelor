-- ============================================================
-- Seed data — run AFTER schema.sql
-- This populates the planning + gear list with the chat content
-- ============================================================

delete from public.slots where party_id = 'wouter-2026-texel';
delete from public.gear  where party_id = 'wouter-2026-texel';

-- 12 juni · prep
insert into public.slots (party_id, day, position, time, title, subtitle) values
('wouter-2026-texel', 0, 0, '—',     'Jef komt aan in Rosmalen',                'Vanuit Frankrijk met de auto, slaapt in hotel'),
('wouter-2026-texel', 0, 1, '—',     'Coördinatie meet Jef + Yahya + Roy',      'Boodschappen voor 2 dagen + finale planning'),
('wouter-2026-texel', 0, 2, '—',     'Sleutels ophalen bij Veerle',             'Tas Wouter staat klaar');

-- 13 juni · ontvoering
insert into public.slots (party_id, day, position, time, title, subtitle) values
('wouter-2026-texel', 1, 0, '07:15', 'Klaarstaan bij Wouter',                   'Voor de deur, sleutels van Veerle'),
('wouter-2026-texel', 1, 1, '07:20', 'Paardenmaskers op, Wouter uit bed',       'In de auto proppen, tas staat klaar'),
('wouter-2026-texel', 1, 2, '07:45', 'Wegrijden richting Den Helder',           'Uiterlijk dit tijdstip vertrekken'),
('wouter-2026-texel', 1, 3, '10:00', 'Aankomst boot Den Helder',                'Overtocht naar Texel'),
('wouter-2026-texel', 1, 4, '11:00', 'Inchecken vakantiehuis',                  'Plek voor 6 personen'),
('wouter-2026-texel', 1, 5, '12:40', 'Parachutesprong Wouter',                  'Tandem · weersafhankelijk'),
('wouter-2026-texel', 1, 6, '14:00', 'Challenges',                              'Airsoft / oesters rapen / surströmming'),
('wouter-2026-texel', 1, 7, '17:00', 'Bier + BBQ bij het huisje',               'Roy heeft setje'),
('wouter-2026-texel', 1, 8, '20:00', 'Dorp in',                                 'Kijken wat er valt te beleven');

-- 14 juni · activiteiten
insert into public.slots (party_id, day, position, time, title, subtitle) values
('wouter-2026-texel', 2, 0, 'ochtend', 'Jacht naar ontbijt + bijkomen',         'Rustige start'),
('wouter-2026-texel', 2, 1, '12:00',   'Blokarten (of plan B)',                 'Geboekt voor 4, mogelijk uitbreiden naar 5'),
('wouter-2026-texel', 2, 2, '15:00',   'Bierbrouwerij tour Texel',              'Met speciaalbier proeverij'),
('wouter-2026-texel', 2, 3, '17:00',   'Eiland af, ergens lekker eten',         'Struisvogelbiefstuk + champagne?');

-- Gear
insert into public.gear (party_id, text, who, got) values
('wouter-2026-texel', 'Blikje surströmming',      'Jef',       true),
('wouter-2026-texel', 'BB guns (meerdere)',       'Jef',       true),
('wouter-2026-texel', '20 paardenmaskers',        'Jef',       true),
('wouter-2026-texel', 'Speciaalbiertjes',         'Jef',       true),
('wouter-2026-texel', 'Goede flessen drank',      'Jef',       true),
('wouter-2026-texel', 'BBQ setje',                'Roy',       true),
('wouter-2026-texel', 'Boodschappen 2 dagen',     'iedereen',  false);
