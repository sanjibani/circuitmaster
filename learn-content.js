/* ============================================================================
   LEARN CONTENT — "Teach Me First" curriculum data
   ----------------------------------------------------------------------------
   Pure data file. Safe to hand to translators / voice artists without JS risk.
   Structure per station:
     {
       title, hook, factory,
       lessons:  [ { id, icon, name, what, why, how, ttsText, audio? } ... ],
       checkpoint: [ { q, options, correct, explain } ... ]
     }
   Each text field is keyed by language code: { en, hi, ta, te }.
   Audio URLs (optional) take precedence over ttsText. If neither exists,
   the engine falls back to silent text-only mode.
   ============================================================================ */
const LEARN_CONTENT = {
    'phone-assembly': {
        icon: '📱',
        title: {
            en: 'Phone Assembly',
            hi: 'फ़ोन असेंबली',
            ta: 'மொபைல் அசेंபிளி',
            te: 'ఫోన్ అసెంబ్లీ'
        },
        hook: {
            en: 'One wrong screw torque and the phone bends in the customer’s pocket. Apple rejected ₹14 crore of iPhones last year for exactly this. Learn the right way here first.',
            hi: 'एक गलत स्क्रू टॉर्क और फ़ोन ग्राहक की जेब में मुड़ जाएगा। पिछले साल Apple ने इसी वजह से ₹14 करोड़ के iPhone रिजेक्ट किए। सही तरीक़ा यहाँ सीखिए।'
        },
        factory: {
            en: 'Foxconn Sriperumbudur · Dixon Noida · Tata Electronics Hosur · Bharat FIH',
            hi: 'फ़ॉक्सकॉन श्रीपेरुम्बुदूर · डिक्सन नोएडा · टाटा इलेक्ट्रॉनिक्स होसुर · भारत FIH'
        },
        wage: {
            en: 'Entry wage: ₹14,500/month + PF + ESI + canteen + hostel',
            hi: 'शुरूआती वेतन: ₹14,500/महीना + PF + ESI + कैंटीन + हॉस्टल'
        },
        duration: { en: '4 min', hi: '4 मिनट' },

        /* ---- lessons (one card per part) ---------------------------------- */
        lessons: [
            {
                id: 'frame',
                icon: '📱',
                partRef: 'frame',
                name: {
                    en: 'Titanium Frame',
                    hi: 'टाइटेनियम फ़्रेम'
                },
                what: {
                    en: 'The metal skeleton that holds every other part in its exact place.',
                    hi: 'धातु का ढाँचा जो बाकी सभी पार्ट्स को सही जगह पर रखता है।'
                },
                why: {
                    en: 'If the frame bends, the screen cracks and the battery can short-circuit. It is the first part placed because everything else references it.',
                    hi: 'अगर फ़्रेम मुड़ गया, स्क्रीन टूटेगी और बैटरी शॉर्ट हो सकती है। यह पहला पार्ट है क्योंकि बाकी सब इसी पर टिका है।'
                },
                how: {
                    en: 'Place it flat on the jig with the SIM tray slot facing left. Check the four screw holes line up with the jig pins before pressing down.',
                    hi: 'जिग पर सपाट रखें, SIM ट्रे का कट बाएँ तरफ़ हो। दबाने से पहले चार स्क्रू होल जिग पिन से मैच करें।'
                },
                ttsText: {
                    en: 'This is the Titanium Frame. It is the metal skeleton of the phone. It holds every other part in its exact place. We always place it first.',
                    hi: 'यह टाइटेनियम फ़्रेम है। यह फ़ोन का धातु ढाँचा है। यह बाक़ी सभी पार्ट्स को उनकी सही जगह पर रखता है। हम इसे सबसे पहले लगाते हैं।',
                    ta: 'இது டைட்டானியம் ஃப்ரேம். இது ஃபோனின் உலோக எலும்புக்கூடு. இது மற்ற எல்லா பாகங்களையும் சரியான இடத்தில் வைக்கிறது. இதை நாம் எப்போதும் முதலில் வைக்கிறோம்.',
                    te: 'ఇది టైటానియం ఫ్రేమ్. ఇది ఫోన్ యొక్క లోహ అస్థిపంజరం. ఇది మిగిలిన అన్ని భాగాలను వాటి సరైన స్థానంలో ఉంచుతుంది. మనం దీన్ని ఎల్లప్పుడూ మొదట ఉంచుతాము.'
                }
            },
            {
                id: 'pcb',
                icon: '🔌',
                partRef: 'pcb',
                name: {
                    en: 'Main Board (PCB)',
                    hi: 'मेन बोर्ड (PCB)'
                },
                what: {
                    en: 'The green circuit board with the processor chip, memory and all the brains of the phone.',
                    hi: 'प्रोसेसर, मेमोरी और फ़ोन का सारा दिमाग़ रखने वाला हरा सर्किट बोर्ड।'
                },
                why: {
                    en: 'This is the most expensive part. One ESD zap (static shock from your body) can destroy a ₹25,000 board in a fraction of a second. Always wear the wrist strap.',
                    hi: 'यह सबसे महँगा पार्ट है। शरीर का एक ESD झटका पल भर में ₹25,000 का बोर्ड ख़राब कर सकता है। हमेशा रिस्ट स्ट्रैप पहनें।'
                },
                how: {
                    en: 'Pick from the anti-static tray using the vacuum pen. Never touch the gold contacts with bare fingers. Align the connector cut-out with the frame notch.',
                    hi: 'वैक्यूम पेन से ही एंटी-स्टैटिक ट्रे से उठाएँ। सोने के कॉन्टैक्ट को कभी नंगी उँगली से न छुएँ। कनेक्टर कटआउट को फ़्रेम के नॉच से मिलाएँ।'
                },
                ttsText: {
                    en: 'This is the main board, also called the P-C-B. It has the processor and the memory. It is the most expensive part. Always wear your E-S-D wrist strap when handling it.',
                    hi: 'यह मेन बोर्ड है, इसे पी-सी-बी भी कहते हैं। इसमें प्रोसेसर और मेमोरी है। यह सबसे महँगा पार्ट है। इसे छूते समय हमेशा ई-एस-डी रिस्ट स्ट्रैप पहनें।',
                    ta: 'இது மெயின் போர்டு, பிசிபி என்றும் அழைக்கப்படுகிறது. இதில் புராசசர் மற்றும் மெமரி உள்ளன. இது மிகவும் விலையுயர்ந்த பாகம். இதை கையாளும்போது எப்போதும் ஈஎஸ்டி ரிஸ்ட் ஸ்ட்ராப் அணியுங்கள்.',
                    te: 'ఇది మెయిన్ బోర్డు, దీన్ని పిసిబి అని కూడా అంటారు. ఇందులో ప్రాసెసర్ మరియు మెమరీ ఉన్నాయి. ఇది అత్యంత ఖరీదైన భాగం. దీన్ని తాకేటప్పుడు ఎల్లప్పుడూ ఈఎస్‌డి రిస్ట్ స్ట్రాప్ ధరించండి.'
                }
            },
            {
                id: 'battery',
                icon: '🔋',
                partRef: 'battery',
                name: {
                    en: 'Battery',
                    hi: 'बैटरी'
                },
                what: {
                    en: 'A 5000mAh lithium-ion pouch that powers the phone for a full day.',
                    hi: '5000mAh लिथियम-आयन पाउच जो फ़ोन को पूरा दिन चार्ज देता है।'
                },
                why: {
                    en: 'Lithium batteries catch fire if punctured or bent. Never drop them, never press hard, and never reuse a battery that has a visible swell.',
                    hi: 'लिथियम बैटरी पंक्चर या मुड़ने पर आग पकड़ सकती है। कभी गिराएँ नहीं, ज़ोर से न दबाएँ, और सूजी हुई बैटरी दोबारा इस्तेमाल न करें।'
                },
                how: {
                    en: 'Peel the blue adhesive liner. Place the battery in the frame well with the + terminal towards the top. Press down with flat fingers — never with a tool.',
                    hi: 'नीली चिपकने वाली परत हटाएँ। बैटरी को फ़्रेम कैविटी में रखें, + टर्मिनल ऊपर की ओर। सपाट उँगलियों से दबाएँ — कभी औज़ार से नहीं।'
                },
                ttsText: {
                    en: 'This is the battery. It stores 5000 milliamp hours of power. Lithium batteries are dangerous if damaged. Never bend or puncture them. Press down only with your flat finger, never with a tool.',
                    hi: 'यह बैटरी है। यह 5000 मिलीएम्पीयर घंटे बिजली रखती है। लिथियम बैटरी क्षतिग्रस्त होने पर ख़तरनाक होती है। इसे कभी मोड़ें या छेदें नहीं। सिर्फ़ सपाट उँगली से दबाएँ, कभी औज़ार से नहीं।',
                    ta: 'இது பேட்டரி. இது 5000 மில்லியாம்ப் மணிநேர மின்சக்தியை சேமிக்கிறது. லித்தியம் பேட்டரிகள் சேதமடைந்தால் மிகவும் ஆபத்தானவை. இவற்றை ஒருபோதும் வளைக்கவோ துளையிடவோ கூடாது. தட்டையான விரலால் மட்டுமே அழுத்துங்கள், எந்த கருவியாலும் அழுத்த வேண்டாம்.',
                    te: 'ఇది బ్యాటరీ. ఇది 5000 మిల్లీయాంప్ గంటల శక్తిని నిల్వ చేస్తుంది. లిథియం బ్యాటరీలు దెబ్బతిన్నట్లయితే ప్రమాదకరం. వీటిని ఎప్పుడూ వంచవద్దు లేదా గుచ్చవద్దు. చదునైన వేలితో మాత్రమే నొక్కండి, ఏ పనిముట్టుతోనూ నొక్కవద్దు.'
                }
            },
            {
                id: 'display',
                icon: '🖥️',
                partRef: 'display',
                name: {
                    en: 'AMOLED Display',
                    hi: 'AMOLED डिस्प्ले'
                },
                what: {
                    en: 'The colour screen the user sees and touches. Made of glass and an OLED panel fused together.',
                    hi: 'रंगीन स्क्रीन जिसे उपयोगकर्ता देखता और छूता है। काँच और OLED पैनल जुड़े हुए।'
                },
                why: {
                    en: 'Every square centimetre costs about ₹350. One fingerprint smudge on the inside means the whole unit is scrap. Keep it in its blue protective film until the last moment.',
                    hi: 'हर वर्ग सेंटीमीटर की क़ीमत लगभग ₹350 है। अंदर की तरफ़ एक उँगली का निशान भी पूरे यूनिट को स्क्रैप बना देता है। आख़िरी पल तक नीली सुरक्षा फ़िल्म में रखें।'
                },
                how: {
                    en: 'Clean hands. Remove blue film only after the frame is ready. Align the flex cable first, then lower the glass straight down — never slide it.',
                    hi: 'साफ़ हाथ ज़रूरी। फ़्रेम तैयार होने के बाद ही नीली फ़िल्म हटाएँ। पहले फ़्लेक्स केबल अलाइन करें, फिर काँच को सीधा नीचे रखें — कभी खिसकाएँ नहीं।'
                },
                ttsText: {
                    en: 'This is the display panel. It is the colour screen. One smudge on the inside makes the whole unit scrap. Keep the blue film on until the last step.',
                    hi: 'यह डिस्प्ले पैनल है। यह रंगीन स्क्रीन है। अंदर का एक निशान पूरे यूनिट को ख़राब कर देता है। नीली फ़िल्म आख़िरी स्टेप तक लगी रहने दें।',
                    ta: 'இது டிஸ்ப்ளே பேனல். இது நிற திரை. உள்பக்கம் ஒரு கறை இருந்தாலும் முழு யூனிட்டும் குப்பையாகும். நீல பாதுகாப்பு படலத்தை கடைசி படிநிலை வரை அகற்ற வேண்டாம்.',
                    te: 'ఇది డిస్‌ప్లే ప్యానెల్. ఇది రంగు తెర. లోపల ఒక్క మరక ఉన్నా మొత్తం యూనిట్ పనికిరాకుండా పోతుంది. నీలి రక్షణ పొరను చివరి దశ వరకు తీయవద్దు.'
                }
            },
            {
                id: 'camera',
                icon: '📷',
                partRef: 'camera',
                name: {
                    en: 'Main Camera Module',
                    hi: 'मुख्य कैमरा मॉड्यूल'
                },
                what: {
                    en: '200-megapixel sensor with an f/1.7 lens and optical image stabilisation (OIS) springs.',
                    hi: '200-मेगापिक्सल सेंसर, f/1.7 लेंस और OIS स्प्रिंग के साथ।'
                },
                why: {
                    en: 'Dust is the enemy. A single dust speck inside the lens shows as a dark spot in every photo the customer takes. Work fast but clean.',
                    hi: 'धूल सबसे बड़ा दुश्मन है। लेंस के अंदर एक धूल का कण भी हर फ़ोटो में दाग़ बन जाता है। तेज़ी से पर साफ़ काम करें।'
                },
                how: {
                    en: 'Use the lint-free ionised blower before removing the lens cap. Seat the module with even pressure on all four corners. Check the gold flex connector clicks into place.',
                    hi: 'लेंस कैप हटाने से पहले आयनाइज़्ड ब्लोअर इस्तेमाल करें। मॉड्यूल को चारों कोनों पर बराबर दबाव से बैठाएँ। गोल्ड फ़्लेक्स कनेक्टर का क्लिक सुनें।'
                },
                ttsText: {
                    en: 'This is the main camera. 200 megapixels with optical stabilisation. Dust is the biggest enemy. Always blow clean before placing. Listen for the click of the gold connector.',
                    hi: 'यह मुख्य कैमरा है। 200 मेगापिक्सल, ऑप्टिकल स्टेबिलाइज़ेशन के साथ। धूल सबसे बड़ा दुश्मन है। लगाने से पहले हमेशा ब्लोअर चलाएँ। गोल्ड कनेक्टर का क्लिक सुनें।',
                    ta: 'இது முதன்மை கேமரா. 200 மெகாபிக்சல், ஒளியியல் நிலைப்படுத்தலுடன். தூசி மிகப்பெரிய எதிரி. வைப்பதற்கு முன் எப்போதும் காற்றால் சுத்தம் செய்யுங்கள். தங்க இணைப்பியின் க்ளிக் ஒலியை கேளுங்கள்.',
                    te: 'ఇది ప్రధాన కెమెరా. 200 మెగాపిక్సెల్, ఆప్టికల్ స్థిరీకరణతో. ధూళి అతిపెద్ద శత్రువు. ఉంచేముందు ఎల్లప్పుడూ గాలితో శుభ్రం చేయండి. బంగారు కనెక్టర్ క్లిక్ శబ్దాన్ని వినండి.'
                }
            },
            {
                id: 'speaker',
                icon: '🔊',
                partRef: 'speaker',
                name: {
                    en: 'Dolby Atmos Speaker',
                    hi: 'डॉल्बी एटमॉस स्पीकर'
                },
                what: {
                    en: 'A stereo speaker unit tuned for loud, clear audio including ringtones, calls and music.',
                    hi: 'स्टीरियो स्पीकर यूनिट — रिंगटोन, कॉल और म्यूज़िक के लिए तेज़ और साफ़ आवाज़।'
                },
                why: {
                    en: 'The tiny mesh on top stops water and dust. If you bend it or stretch it during assembly, the phone fails the IP68 water test and the whole unit is rejected.',
                    hi: 'ऊपर की छोटी जाली पानी और धूल रोकती है। असेंबली में उसे मोड़ा या खींचा तो फ़ोन IP68 वाटर टेस्ट फ़ेल कर देगा और पूरा यूनिट रिजेक्ट होगा।'
                },
                how: {
                    en: 'Handle only by the plastic body. Seat it straight into the cavity. Never press on the mesh grille directly.',
                    hi: 'सिर्फ़ प्लास्टिक बॉडी से पकड़ें। सीधा कैविटी में बिठाएँ। जाली पर सीधे कभी न दबाएँ।'
                },
                ttsText: {
                    en: 'This is the speaker module. The small mesh on top is a water barrier. Never press on it, never stretch it. Handle only by the plastic body.',
                    hi: 'यह स्पीकर मॉड्यूल है। ऊपर की छोटी जाली पानी का बैरियर है। इस पर कभी न दबाएँ, कभी न खींचें। सिर्फ़ प्लास्टिक बॉडी से पकड़ें।',
                    ta: 'இது ஸ்பீக்கர் தொகுதி. மேல் உள்ள சிறிய வலை நீர் தடுப்பான். இதை ஒருபோதும் அழுத்தவேண்டாம், நீட்டவேண்டாம். பிளாஸ்டிக் உடலால் மட்டுமே பிடியுங்கள்.',
                    te: 'ఇది స్పీకర్ మాడ్యూల్. పైన ఉన్న చిన్న వల నీటి అడ్డంకి. దీన్ని ఎప్పుడూ నొక్కవద్దు, సాగదీయవద్దు. ప్లాస్టిక్ బాడీ ద్వారా మాత్రమే పట్టుకోండి.'
                }
            },
            {
                id: 'usbc',
                icon: '🔌',
                partRef: 'usbc',
                name: {
                    en: 'USB-C Charging Port',
                    hi: 'USB-C चार्जिंग पोर्ट'
                },
                what: {
                    en: 'The connector at the bottom of the phone used for charging and data transfer.',
                    hi: 'फ़ोन के नीचे का कनेक्टर जो चार्जिंग और डेटा के लिए है।'
                },
                why: {
                    en: 'A bent pin inside the port means the phone cannot charge. Customers return the phone the same week. This single defect causes 30% of all DOA (dead on arrival) returns.',
                    hi: 'पोर्ट में एक मुड़ा हुआ पिन मतलब फ़ोन चार्ज नहीं होगा। ग्राहक उसी हफ़्ते वापस कर देता है। यह अकेला डिफ़ेक्ट DOA रिटर्न का 30% कारण है।'
                },
                how: {
                    en: 'Use the magnifier. Count all 24 gold pins — none bent, none missing. Only then solder the flex cable.',
                    hi: 'मैग्निफ़ायर से देखें। सभी 24 गोल्ड पिन गिनें — कोई मुड़ा नहीं, कोई ग़ायब नहीं। तभी फ़्लेक्स केबल सोल्डर करें।'
                },
                ttsText: {
                    en: 'This is the USB-C charging port. Always check all twenty-four gold pins under the magnifier. One bent pin and the phone cannot charge. Thirty percent of customer returns are because of this.',
                    hi: 'यह USB-C चार्जिंग पोर्ट है। मैग्निफ़ायर के नीचे हमेशा सभी चौबीस गोल्ड पिन जाँचें। एक भी मुड़ा पिन और फ़ोन चार्ज नहीं होगा। तीस प्रतिशत ग्राहक रिटर्न इसी वजह से होते हैं।',
                    ta: 'இது யூ எஸ் பி சி சார்ஜிங் போர்ட். பெரிதாக்கியின் கீழ் இருபத்து நான்கு தங்க முள்களையும் எப்போதும் சரிபார்க்கவும். ஒரு முள் வளைந்திருந்தாலும் ஃபோன் சார்ஜ் ஆகாது. வாடிக்கையாளர் திருப்பிக் கொடுப்பதில் முப்பது சதவீதம் இதனால்தான்.',
                    te: 'ఇది యూ ఎస్ బి సి చార్జింగ్ పోర్ట్. మాగ్నిఫైయర్ కింద ఇరవై నాలుగు బంగారు పిన్‌లను ఎల్లప్పుడూ తనిఖీ చేయండి. ఒక్క పిన్ వంగినా ఫోన్ చార్జ్ కాదు. ముప్పై శాతం కస్టమర్ రిటర్న్‌లు దీనికే కారణం.'
                }
            },
            {
                id: 'glass',
                icon: '🪞',
                partRef: 'glass',
                name: {
                    en: 'Gorilla Glass Back',
                    hi: 'गोरिल्ला ग्लास बैक'
                },
                what: {
                    en: 'The strong glass panel on the back of the phone with the company logo.',
                    hi: 'फ़ोन के पीछे का मज़बूत काँच पैनल जिस पर कंपनी का लोगो होता है।'
                },
                why: {
                    en: 'This is the last part placed. Once sealed, any dust trapped inside is permanent. A final air-blast is mandatory before closing.',
                    hi: 'यह आख़िरी पार्ट है। एक बार सील हो गया तो अंदर फँसी धूल हमेशा रहेगी। बंद करने से पहले एयर-ब्लास्ट ज़रूरी है।'
                },
                how: {
                    en: 'Apply adhesive perimeter. Lower straight down. Press firmly around the edges, not the centre. Hold for 30 seconds for the adhesive to bond.',
                    hi: 'किनारों पर गोंद लगाएँ। सीधा नीचे रखें। किनारों को मज़बूती से दबाएँ, बीच में नहीं। गोंद जमने के लिए 30 सेकंड पकड़ें।'
                },
                ttsText: {
                    en: 'This is the Gorilla Glass back panel. It is the last part. Once sealed the phone is closed forever. Always blow clean before sealing.',
                    hi: 'यह गोरिल्ला ग्लास बैक पैनल है। यह आख़िरी पार्ट है। एक बार सील हो गया तो फ़ोन हमेशा के लिए बंद है। सील करने से पहले हमेशा ब्लोअर चलाएँ।',
                    ta: 'இது கொரில்லா கிளாஸ் பின்பக்க பேனல். இது கடைசி பாகம். ஒருமுறை சீல் செய்தபின் ஃபோன் நிரந்தரமாக மூடப்படுகிறது. சீல் செய்வதற்கு முன் எப்போதும் காற்றால் சுத்தம் செய்யுங்கள்.',
                    te: 'ఇది గొరిల్లా గ్లాస్ వెనుక ప్యానెల్. ఇది చివరి భాగం. ఒకసారి సీల్ చేసిన తర్వాత ఫోన్ శాశ్వతంగా మూసివేయబడుతుంది. సీల్ చేయడానికి ముందు ఎల్లప్పుడూ గాలితో శుభ్రం చేయండి.'
                }
            }
        ],

        /* ---- end-of-lesson checkpoint (visual MCQ) ------------------------ */
        checkpoint: [
            {
                q: {
                    en: 'Which part should you place FIRST when assembling a phone?',
                    hi: 'फ़ोन असेंबली में सबसे पहले कौन सा पार्ट लगाना चाहिए?'
                },
                options: [
                    { id: 'battery', label: { en: 'Battery',       hi: 'बैटरी' } },
                    { id: 'frame',   label: { en: 'Titanium Frame',hi: 'टाइटेनियम फ़्रेम' } },
                    { id: 'display', label: { en: 'Display',       hi: 'डिस्प्ले' } }
                ],
                correct: 'frame',
                explain: {
                    en: 'The frame is placed first because every other part references its position.',
                    hi: 'फ़्रेम सबसे पहले लगता है क्योंकि बाक़ी सभी पार्ट्स उसी की स्थिति पर निर्भर हैं।'
                }
            },
            {
                q: {
                    en: 'You see a battery with a small swell on one side. What do you do?',
                    hi: 'एक बैटरी के एक तरफ़ छोटी सूजन दिख रही है। आप क्या करेंगे?'
                },
                options: [
                    { id: 'use',    label: { en: 'Use it anyway',         hi: 'फिर भी इस्तेमाल करें' } },
                    { id: 'press',  label: { en: 'Press it flat',         hi: 'दबाकर सपाट कर दें' } },
                    { id: 'reject', label: { en: 'Reject — send to scrap',hi: 'रिजेक्ट — स्क्रैप भेजें' } }
                ],
                correct: 'reject',
                explain: {
                    en: 'A swollen lithium battery can catch fire. It must never be used, pressed, or reshaped.',
                    hi: 'सूजी हुई लिथियम बैटरी आग पकड़ सकती है। इसे कभी इस्तेमाल, दबाना या बदलना नहीं चाहिए।'
                }
            },
            {
                q: {
                    en: 'Why must you wear an ESD wrist strap when handling the main board?',
                    hi: 'मेन बोर्ड छूते समय ESD रिस्ट स्ट्रैप क्यों पहनना ज़रूरी है?'
                },
                options: [
                    { id: 'look',  label: { en: 'So you look professional',            hi: 'ताकि प्रोफ़ेशनल दिखें' } },
                    { id: 'zap',   label: { en: 'Static electricity can destroy chips',hi: 'स्थैतिक बिजली चिप ख़राब कर सकती है' } },
                    { id: 'safe',  label: { en: 'To protect you from electric shock',  hi: 'आपको बिजली के झटके से बचाने के लिए' } }
                ],
                correct: 'zap',
                explain: {
                    en: 'Your body holds thousands of volts of static. One tiny spark invisible to you can kill a ₹25,000 chip instantly.',
                    hi: 'आपके शरीर में हज़ारों वोल्ट की स्थैतिक बिजली होती है। एक छोटी सी चिंगारी जो आपको दिखती भी नहीं ₹25,000 की चिप पल भर में ख़राब कर सकती है।'
                }
            }
        ]
    }

    // Future stations: pcb-design, smt-line, qc-inspector (same shape)
};

// Expose to engine
if (typeof window !== 'undefined') window.LEARN_CONTENT = LEARN_CONTENT;
